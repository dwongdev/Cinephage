/**
 * ExtractionCoordinator - Manages NZB download and extraction pipeline.
 *
 * Handles the 3-phase extraction process:
 * 1. Download all segments from NNTP
 * 2. Detect file type (archive vs media)
 * 3. Extract if needed
 *
 * Supports cancellation, progress tracking, and cleanup.
 */

import { existsSync } from 'fs';
import { mkdir, readdir, rm, stat, rename } from 'fs/promises';
import { join } from 'path';
import { logger } from '$lib/logging';
import { getNntpClientManager } from './nntp/NntpClientManager';
import { type ParsedNzb } from './NzbParser';
import { getNzbMountManager, type MountInfo } from './NzbMountManager';
import { NzbDownloader } from './extraction/NzbDownloader';
import { getExtractionService } from './extraction/ExtractionService';
import { getExtractionCacheManager } from './extraction/ExtractionCacheManager';
import { MEDIA_EXTENSIONS_NO_DOT_SET } from './constants';
import { db } from '$lib/server/db';
import { rootFolders } from '$lib/server/db/schema';

/**
 * Extraction progress callback.
 */
export type ExtractionProgressCallback = (progress: {
	phase: 'downloading' | 'extracting' | 'complete' | 'error';
	downloadProgress?: number;
	extractionProgress?: number;
	currentFile?: string;
	error?: string;
}) => void;

/**
 * Extraction result.
 */
export interface ExtractionResult {
	success: boolean;
	extractedFilePath?: string;
	error?: string;
}

/**
 * Active extraction tracking.
 */
interface ActiveExtraction {
	mountId: string;
	promise: Promise<ExtractionResult>;
	abortController: AbortController;
}

/**
 * Callback type for getting parsed NZB from the main service.
 */
export type GetParsedNzbFn = (mount: MountInfo) => Promise<ParsedNzb>;

/**
 * ExtractionCoordinator handles the download and extraction pipeline.
 */
class ExtractionCoordinator {
	private activeExtractions: Map<string, ActiveExtraction> = new Map();
	private extractionBaseDir: string | null = null;

	/**
	 * Start extraction process for a mount.
	 * Downloads all segments and extracts the archive.
	 */
	async startExtraction(
		mountId: string,
		getParsedNzb: GetParsedNzbFn,
		onProgress?: ExtractionProgressCallback
	): Promise<ExtractionResult> {
		// Check if extraction is already in progress
		const existing = this.activeExtractions.get(mountId);
		if (existing) {
			logger.info('[ExtractionCoordinator] Extraction already in progress', { mountId });
			return existing.promise;
		}

		const mountManager = getNzbMountManager();
		const clientManager = getNntpClientManager();

		// Get mount info
		const mount = await mountManager.getMount(mountId);
		if (!mount) {
			return { success: false, error: 'Mount not found' };
		}

		// Get parsed NZB
		const parsed = await getParsedNzb(mount);

		// Create abort controller for cancellation
		const abortController = new AbortController();

		// Start extraction in background
		const extractionPromise = this.runExtraction(
			mountId,
			mount,
			parsed,
			clientManager,
			abortController.signal,
			onProgress
		);

		// Track active extraction
		this.activeExtractions.set(mountId, {
			mountId,
			promise: extractionPromise,
			abortController
		});

		// Clean up when done
		extractionPromise.finally(() => {
			this.activeExtractions.delete(mountId);
		});

		return extractionPromise;
	}

	/**
	 * Run the extraction process.
	 */
	private async runExtraction(
		mountId: string,
		mount: MountInfo,
		parsed: ParsedNzb,
		clientManager: ReturnType<typeof getNntpClientManager>,
		signal: AbortSignal,
		onProgress?: ExtractionProgressCallback
	): Promise<ExtractionResult> {
		const mountManager = getNzbMountManager();

		try {
			// Update mount status to downloading
			await mountManager.updateStatus(mountId, 'downloading');

			const baseDir = await this.getExtractionDir();
			const downloadDir = join(baseDir, mountId, 'download');
			const extractDir = join(baseDir, mountId, 'extracted');

			await mkdir(downloadDir, { recursive: true });
			await mkdir(extractDir, { recursive: true });

			// Determine filename for download
			// For RAR archives, use the first RAR file's name
			// Otherwise use the first file's name
			const firstRarFile = parsed.files.find((f) => f.isRar);
			const primaryFile = firstRarFile || parsed.files[0];
			const downloadedFileName = primaryFile?.name || 'download.bin';

			// For multi-part RARs, we download to a single combined file
			// The RAR extractor can handle the combined format
			const downloadPath = join(downloadDir, downloadedFileName);

			// Phase 1: Download all segments
			logger.info('[ExtractionCoordinator] Starting download phase', {
				mountId,
				files: parsed.files.length,
				outputFile: downloadedFileName
			});

			const stateDir = join(baseDir, '.state');
			await mkdir(stateDir, { recursive: true });
			const downloader = new NzbDownloader(clientManager, stateDir);

			const downloadResult = await downloader.downloadFiles(parsed.files, {
				outputPath: downloadPath,
				onProgress: (progress) => {
					const percent =
						progress.totalBytes > 0
							? Math.round((progress.downloadedBytes / progress.totalBytes) * 100)
							: 0;

					onProgress?.({
						phase: 'downloading',
						downloadProgress: percent
					});
				},
				signal,
				resume: true
			});

			if (!downloadResult.success) {
				throw new Error(downloadResult.error || 'Download failed');
			}

			// Check for abort
			if (signal.aborted) {
				throw new Error('Extraction cancelled');
			}

			// Phase 2: Determine if we need to extract or file is ready
			logger.info('[ExtractionCoordinator] Download complete, checking file type', {
				mountId,
				downloadedFile: downloadPath,
				size: downloadResult.totalBytes
			});

			// Check if the downloaded file is an archive
			const ext = downloadedFileName.toLowerCase().split('.').pop() || '';
			const isArchive = ['rar', 'r00', 'r01', '7z', 'zip'].includes(ext);

			if (!isArchive) {
				// Check if it's a media file
				if (MEDIA_EXTENSIONS_NO_DOT_SET.has(ext)) {
					// Move to extracted directory
					const destPath = join(extractDir, downloadedFileName);
					await rename(downloadPath, destPath);

					await mountManager.updateStatus(mountId, 'ready');
					onProgress?.({ phase: 'complete' });

					return {
						success: true,
						extractedFilePath: destPath
					};
				}
			}

			// Phase 3: Extract the archive
			await mountManager.updateStatus(mountId, 'extracting');

			logger.info('[ExtractionCoordinator] Starting extraction phase', {
				mountId,
				archiveFile: downloadPath
			});

			const extractionService = getExtractionService();
			const extractResult = await extractionService.extract(downloadPath, extractDir, {
				onProgress: (progress) => {
					const percent =
						progress.totalBytes > 0
							? Math.round((progress.extractedBytes / progress.totalBytes) * 100)
							: 0;

					onProgress?.({
						phase: 'extracting',
						extractionProgress: percent,
						currentFile: progress.currentFile
					});
				}
			});

			if (!extractResult.success) {
				throw new Error(extractResult.error || 'Extraction failed');
			}

			// Find the largest media file from extraction
			const largestMediaFile = extractResult.files
				.filter((f) => {
					const fileExt = f.diskPath.toLowerCase().split('.').pop() || '';
					return MEDIA_EXTENSIONS_NO_DOT_SET.has(fileExt);
				})
				.sort((a, b) => b.size - a.size)[0];

			if (!largestMediaFile) {
				throw new Error('No media file found in extracted archive');
			}

			// Cleanup downloaded archive files
			try {
				await rm(downloadDir, { recursive: true, force: true });
			} catch {
				// Ignore cleanup errors
			}

			// Update mount status to ready
			await mountManager.updateStatus(mountId, 'ready');

			// Set expiration for auto-cleanup
			const cacheManager = getExtractionCacheManager();
			await cacheManager.setExpiration(mountId, largestMediaFile.diskPath);

			logger.info('[ExtractionCoordinator] Extraction complete', {
				mountId,
				extractedFile: largestMediaFile.diskPath,
				size: largestMediaFile.size
			});

			onProgress?.({ phase: 'complete' });

			return {
				success: true,
				extractedFilePath: largestMediaFile.diskPath
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';

			logger.error('[ExtractionCoordinator] Extraction failed', {
				mountId,
				error: message
			});

			await mountManager.updateStatus(mountId, 'error');

			onProgress?.({
				phase: 'error',
				error: message
			});

			return {
				success: false,
				error: message
			};
		}
	}

	/**
	 * Cancel an ongoing extraction.
	 */
	cancelExtraction(mountId: string): boolean {
		const extraction = this.activeExtractions.get(mountId);
		if (!extraction) {
			return false;
		}

		extraction.abortController.abort();
		this.activeExtractions.delete(mountId);

		logger.info('[ExtractionCoordinator] Extraction cancelled', { mountId });
		return true;
	}

	/**
	 * Check if extraction is in progress for a mount.
	 */
	isExtractionInProgress(mountId: string): boolean {
		return this.activeExtractions.has(mountId);
	}

	/**
	 * Clean up extracted files for a mount.
	 */
	async cleanupExtractedFiles(mountId: string): Promise<void> {
		const baseDir = await this.getExtractionDir();
		const mountDir = join(baseDir, mountId);

		if (existsSync(mountDir)) {
			await rm(mountDir, { recursive: true, force: true });
			logger.info('[ExtractionCoordinator] Cleaned up extracted files', { mountId });
		}
	}

	/**
	 * Get the path to an extracted file for a mount.
	 */
	async getExtractedFilePath(mountId: string): Promise<string | null> {
		const baseDir = await this.getExtractionDir();
		const mountDir = join(baseDir, mountId);

		if (!existsSync(mountDir)) {
			return null;
		}

		// Find the largest media file in the extraction directory
		try {
			const files = await readdir(mountDir, { recursive: true });
			let largestFile: { path: string; size: number } | null = null;

			for (const file of files) {
				const filePath = join(mountDir, file.toString());
				const stats = await stat(filePath);

				if (!stats.isFile()) continue;

				// Check if it's a media file
				const ext = filePath.toLowerCase().split('.').pop() || '';

				if (MEDIA_EXTENSIONS_NO_DOT_SET.has(ext)) {
					if (!largestFile || stats.size > largestFile.size) {
						largestFile = { path: filePath, size: stats.size };
					}
				}
			}

			return largestFile?.path ?? null;
		} catch {
			return null;
		}
	}

	/**
	 * Get the extraction directory (first root folder with extraction enabled).
	 */
	async getExtractionDir(): Promise<string> {
		if (this.extractionBaseDir) {
			return this.extractionBaseDir;
		}

		// Get the first root folder to use for extraction cache
		const folders = db.select().from(rootFolders).all();
		if (folders.length === 0) {
			throw new Error('No root folders configured for extraction storage');
		}

		// Use .usenet-extraction subdirectory in first root folder
		const baseDir = join(folders[0].path, '.usenet-extraction');
		await mkdir(baseDir, { recursive: true });
		this.extractionBaseDir = baseDir;

		logger.info('[ExtractionCoordinator] Using extraction directory', { baseDir });
		return baseDir;
	}

	/**
	 * Shutdown and cancel all active extractions.
	 */
	shutdown(): void {
		for (const [mountId, extraction] of this.activeExtractions) {
			extraction.abortController.abort();
			logger.info('[ExtractionCoordinator] Cancelled extraction on shutdown', { mountId });
		}
		this.activeExtractions.clear();
	}
}

// Singleton instance
let instance: ExtractionCoordinator | null = null;

/**
 * Get the singleton ExtractionCoordinator.
 */
export function getExtractionCoordinator(): ExtractionCoordinator {
	if (!instance) {
		instance = new ExtractionCoordinator();
	}
	return instance;
}
