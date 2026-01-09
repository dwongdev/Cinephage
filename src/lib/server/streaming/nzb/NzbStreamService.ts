/**
 * NzbStreamService - Coordinates NZB streaming operations.
 *
 * Central service for creating streams from NZB content.
 * Delegates streamability checking to StreamabilityChecker and
 * extraction to ExtractionCoordinator.
 */

import { Readable } from 'node:stream';
import { createReadStream, existsSync, statSync } from 'fs';
import { basename } from 'path';
import { logger } from '$lib/logging';
import { getNntpClientManager } from './nntp/NntpClientManager';
import { type ParsedNzb } from './NzbParser';
import { getNzbMountManager, type MountInfo, type StreamabilityInfo } from './NzbMountManager';
import { NzbSeekableStream, parseRangeHeader } from './streams/NzbSeekableStream';
import { assembleMultiPartRar, findLargestMediaFile } from './rar/MultiPartAssembler';
import { RarVirtualFile } from './rar/RarVirtualFile';
import { getContentType } from './constants';
import { getStreamabilityChecker } from './StreamabilityChecker';
import {
	getExtractionCoordinator,
	type ExtractionProgressCallback,
	type ExtractionResult
} from './ExtractionCoordinator';

/**
 * Cached parsed NZB for active streams.
 */
interface CachedNzb {
	parsed: ParsedNzb;
	timestamp: number;
}

/**
 * Track active streams per mount for cleanup scheduling.
 */
interface MountStreamState {
	activeCount: number;
	cleanupTimer: ReturnType<typeof setTimeout> | null;
	hasExtractedFile: boolean;
}

/**
 * Stream creation result.
 */
export interface CreateStreamResult {
	stream: Readable;
	contentLength: number;
	startByte: number;
	endByte: number;
	totalSize: number;
	isPartial: boolean;
	contentType: string;
}

// Re-export types from ExtractionCoordinator for backwards compatibility
export type { ExtractionProgressCallback, ExtractionResult };

/**
 * NZB cache TTL (1 hour).
 */
const NZB_CACHE_TTL = 60 * 60 * 1000;

/**
 * Delay before cleaning up extracted files after all streams end (2 minutes).
 * This allows for seeking/buffering without re-extracting.
 */
const STREAM_CLEANUP_DELAY_MS = 2 * 60 * 1000;

/**
 * NzbStreamService manages streaming operations.
 */
class NzbStreamService {
	private nzbCache: Map<string, CachedNzb> = new Map();
	private cleanupInterval: ReturnType<typeof setInterval> | null = null;
	private mountStreamStates: Map<string, MountStreamState> = new Map();

	constructor() {
		// Periodic cache cleanup
		this.cleanupInterval = setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
	}

	/**
	 * Create a stream for a mount file.
	 */
	async createStream(
		mountId: string,
		fileIndex: number,
		rangeHeader: string | null
	): Promise<CreateStreamResult> {
		const mountManager = getNzbMountManager();
		const clientManager = getNntpClientManager();
		const extractionCoordinator = getExtractionCoordinator();

		// Get mount info
		const mount = await mountManager.getMount(mountId);
		if (!mount) {
			throw new Error(`Mount not found: ${mountId}`);
		}

		// Check if we have an extracted file ready to stream
		const extractedFilePath = await extractionCoordinator.getExtractedFilePath(mountId);
		if (extractedFilePath && existsSync(extractedFilePath)) {
			logger.info('[NzbStreamService] Streaming from extracted file', {
				mountId,
				extractedFilePath
			});

			// No longer refresh expiration - will cleanup after stream ends instead

			return this.createExtractedFileStream(mountId, extractedFilePath, rangeHeader);
		}

		// If mount requires extraction and no extracted file exists, inform caller
		if (mount.status === 'requires_extraction') {
			throw new Error(
				'Content requires extraction before streaming. Call startExtraction() first.'
			);
		}

		// If extraction is in progress, throw appropriate error
		if (mount.status === 'downloading' || mount.status === 'extracting') {
			throw new Error(`Extraction in progress: ${mount.status}`);
		}

		if (mount.status !== 'ready') {
			throw new Error(`Mount not ready: ${mount.status}`);
		}

		// Get the parsed NZB (from cache or re-fetch)
		const parsed = await this.getParsedNzb(mount);

		// Check if this NZB contains only RAR files (needs RAR streaming)
		const hasOnlyRar = parsed.files.length > 0 && parsed.files.every((f) => f.isRar);

		if (hasOnlyRar) {
			return this.createRarStream(mountId, parsed, rangeHeader, clientManager);
		}

		// Standard NZB streaming for non-RAR files
		const file = parsed.files.find((f) => f.index === fileIndex);
		if (!file) {
			throw new Error(`File not found at index ${fileIndex}`);
		}

		// Update access time
		await mountManager.touchMount(mountId);

		// Parse range header
		const range = parseRangeHeader(rangeHeader, file.size);

		// Create stream
		const stream = new NzbSeekableStream({
			file,
			clientManager,
			range: range ?? undefined,
			prefetchCount: 5
		});

		const contentType = getContentType(file.name);

		logger.info('[NzbStreamService] Created stream', {
			mountId,
			fileIndex,
			fileName: file.name,
			range: range ? `${range.start}-${range.end}` : 'full',
			contentType
		});

		return {
			stream,
			contentLength: stream.contentLength,
			startByte: stream.startByte,
			endByte: stream.endByte,
			totalSize: stream.totalSize,
			isPartial: range !== null,
			contentType
		};
	}

	/**
	 * Create a stream for content inside a RAR archive.
	 */
	private async createRarStream(
		mountId: string,
		parsed: ParsedNzb,
		rangeHeader: string | null,
		clientManager: ReturnType<typeof getNntpClientManager>
	): Promise<CreateStreamResult> {
		// Update access time
		const mountManager = getNzbMountManager();
		await mountManager.touchMount(mountId);

		// Check RAR cache from streamability checker first
		const streamabilityChecker = getStreamabilityChecker();
		let assembled = streamabilityChecker.getCachedRar(mountId);

		if (!assembled) {
			logger.info('[NzbStreamService] Assembling RAR archive', {
				mountId,
				rarFiles: parsed.files.length
			});

			// Assemble the multi-part RAR
			assembled = await assembleMultiPartRar(parsed.files, clientManager);

			// Cache for subsequent range requests
			streamabilityChecker.cacheRar(mountId, assembled);
		}

		// Check if RAR is streamable (uncompressed)
		if (!assembled.isStreamable) {
			throw new Error(
				'This release uses RAR compression and cannot be streamed. Please search for a different release.'
			);
		}

		// Find the largest media file inside the RAR
		const innerFile = findLargestMediaFile(assembled);
		if (!innerFile) {
			throw new Error('No video file found inside the RAR archive.');
		}

		// Check if inner file is encrypted without password
		if (innerFile.isEncrypted) {
			throw new Error(
				'This release is password protected. Please provide password or search for an unprotected release.'
			);
		}

		// Parse range header against inner file size
		const range = parseRangeHeader(rangeHeader, innerFile.size);

		// Create RAR virtual file stream
		const stream = new RarVirtualFile({
			assembledRar: assembled,
			innerFile,
			nzbFiles: parsed.files,
			clientManager,
			range: range ?? undefined,
			prefetchCount: 5
		});

		const contentType = getContentType(innerFile.name);

		logger.info('[NzbStreamService] Created RAR stream', {
			mountId,
			innerFile: innerFile.name,
			innerSize: innerFile.size,
			volumes: assembled.volumes.length,
			range: range ? `${range.start}-${range.end}` : 'full',
			contentType
		});

		return {
			stream,
			contentLength: stream.contentLength,
			startByte: stream.startByte,
			endByte: stream.endByte,
			totalSize: stream.totalSize,
			isPartial: range !== null,
			contentType
		};
	}

	/**
	 * Create a stream from an extracted local file with Range support.
	 * Tracks active streams and schedules cleanup when all streams end.
	 */
	private async createExtractedFileStream(
		mountId: string,
		filePath: string,
		rangeHeader: string | null
	): Promise<CreateStreamResult> {
		const stats = statSync(filePath);
		const totalSize = stats.size;

		// Parse range header
		const range = parseRangeHeader(rangeHeader, totalSize);

		let startByte = 0;
		let endByte = totalSize - 1;

		if (range) {
			startByte = range.start;
			endByte = range.end;
		}

		const contentLength = endByte - startByte + 1;

		// Create read stream with range
		const stream = createReadStream(filePath, {
			start: startByte,
			end: endByte
		});

		// Track this stream for cleanup scheduling
		this.trackStreamStart(mountId, true);

		// When stream ends, schedule cleanup
		stream.once('close', () => {
			this.trackStreamEnd(mountId);
		});

		const contentType = getContentType(filePath);

		logger.info('[NzbStreamService] Created extracted file stream', {
			filePath: basename(filePath),
			range: range ? `${startByte}-${endByte}` : 'full',
			contentLength,
			totalSize
		});

		return {
			stream,
			contentLength,
			startByte,
			endByte,
			totalSize,
			isPartial: range !== null,
			contentType
		};
	}

	/**
	 * Track when a stream starts for a mount.
	 */
	private trackStreamStart(mountId: string, hasExtractedFile: boolean): void {
		let state = this.mountStreamStates.get(mountId);

		if (!state) {
			state = { activeCount: 0, cleanupTimer: null, hasExtractedFile };
			this.mountStreamStates.set(mountId, state);
		}

		// Cancel any pending cleanup since a new stream started
		if (state.cleanupTimer) {
			clearTimeout(state.cleanupTimer);
			state.cleanupTimer = null;
		}

		state.activeCount++;
		state.hasExtractedFile = hasExtractedFile;

		logger.debug('[NzbStreamService] Stream started', {
			mountId,
			activeCount: state.activeCount
		});
	}

	/**
	 * Track when a stream ends for a mount.
	 * Schedules cleanup if no more active streams.
	 */
	private trackStreamEnd(mountId: string): void {
		const state = this.mountStreamStates.get(mountId);
		if (!state) return;

		state.activeCount = Math.max(0, state.activeCount - 1);

		logger.debug('[NzbStreamService] Stream ended', {
			mountId,
			activeCount: state.activeCount
		});

		// If no more active streams and has extracted files, schedule cleanup
		if (state.activeCount === 0 && state.hasExtractedFile) {
			this.scheduleExtractedFileCleanup(mountId);
		}
	}

	/**
	 * Schedule cleanup of extracted files after a delay.
	 * Allows time for seeking/buffering without immediate deletion.
	 */
	private scheduleExtractedFileCleanup(mountId: string): void {
		const state = this.mountStreamStates.get(mountId);
		if (!state) return;

		// Cancel any existing timer
		if (state.cleanupTimer) {
			clearTimeout(state.cleanupTimer);
		}

		logger.info('[NzbStreamService] Scheduling extracted file cleanup', {
			mountId,
			delayMs: STREAM_CLEANUP_DELAY_MS
		});

		state.cleanupTimer = setTimeout(async () => {
			// Double-check no new streams started
			const currentState = this.mountStreamStates.get(mountId);
			if (currentState && currentState.activeCount === 0) {
				logger.info('[NzbStreamService] Cleaning up extracted files after stream ended', {
					mountId
				});

				try {
					await this.cleanupExtractedFiles(mountId);
					this.mountStreamStates.delete(mountId);
				} catch (error) {
					logger.error('[NzbStreamService] Failed to cleanup extracted files', {
						mountId,
						error: error instanceof Error ? error.message : 'Unknown error'
					});
				}
			}
		}, STREAM_CLEANUP_DELAY_MS);
	}

	/**
	 * Check if a mount's content can be streamed directly or requires extraction.
	 * Delegates to StreamabilityChecker.
	 */
	async checkStreamability(mountId: string): Promise<StreamabilityInfo> {
		const checker = getStreamabilityChecker();
		return checker.checkStreamability(mountId, (mount) => this.getParsedNzb(mount));
	}

	/**
	 * Start extraction process for a mount.
	 * Delegates to ExtractionCoordinator.
	 */
	async startExtraction(
		mountId: string,
		onProgress?: ExtractionProgressCallback
	): Promise<ExtractionResult> {
		const coordinator = getExtractionCoordinator();
		return coordinator.startExtraction(mountId, (mount) => this.getParsedNzb(mount), onProgress);
	}

	/**
	 * Cancel an ongoing extraction.
	 * Delegates to ExtractionCoordinator.
	 */
	cancelExtraction(mountId: string): boolean {
		const coordinator = getExtractionCoordinator();
		return coordinator.cancelExtraction(mountId);
	}

	/**
	 * Check if extraction is in progress for a mount.
	 * Delegates to ExtractionCoordinator.
	 */
	isExtractionInProgress(mountId: string): boolean {
		const coordinator = getExtractionCoordinator();
		return coordinator.isExtractionInProgress(mountId);
	}

	/**
	 * Clean up extracted files for a mount.
	 * Delegates to ExtractionCoordinator.
	 */
	async cleanupExtractedFiles(mountId: string): Promise<void> {
		const coordinator = getExtractionCoordinator();
		return coordinator.cleanupExtractedFiles(mountId);
	}

	/**
	 * Get parsed NZB from cache or storage.
	 */
	private async getParsedNzb(mount: MountInfo): Promise<ParsedNzb> {
		// Check cache
		const cached = this.nzbCache.get(mount.nzbHash);
		if (cached && Date.now() - cached.timestamp < NZB_CACHE_TTL) {
			return cached.parsed;
		}

		// Check if we have mediaFiles with full segment data
		// If not, we need to re-fetch the NZB
		if (mount.mediaFiles.length > 0 && mount.mediaFiles[0].segments?.length > 0) {
			// We have full data, reconstruct ParsedNzb
			const parsed: ParsedNzb = {
				hash: mount.nzbHash,
				files: mount.mediaFiles,
				mediaFiles: mount.mediaFiles.filter((f) => !f.isRar),
				totalSize: mount.totalSize,
				groups: mount.mediaFiles.flatMap((f) => f.groups).filter((v, i, a) => a.indexOf(v) === i)
			};

			this.nzbCache.set(mount.nzbHash, { parsed, timestamp: Date.now() });
			return parsed;
		}

		throw new Error('NZB content not available - mount needs to be recreated');
	}

	/**
	 * Store parsed NZB in cache.
	 */
	cacheNzb(hash: string, parsed: ParsedNzb): void {
		this.nzbCache.set(hash, {
			parsed,
			timestamp: Date.now()
		});
	}

	/**
	 * Check if NNTP service is ready.
	 */
	isReady(): boolean {
		const manager = getNntpClientManager();
		return manager.status === 'ready';
	}

	/**
	 * Get service status info.
	 */
	getStatus(): { ready: boolean; providers: number; pools: Record<string, unknown> } {
		const manager = getNntpClientManager();
		return {
			ready: manager.status === 'ready',
			providers: Object.keys(manager.getStats()).length,
			pools: manager.getStats()
		};
	}

	/**
	 * Cleanup old cache entries.
	 */
	private cleanupCache(): void {
		const now = Date.now();
		let cleaned = 0;

		for (const [hash, cached] of this.nzbCache) {
			if (now - cached.timestamp > NZB_CACHE_TTL) {
				this.nzbCache.delete(hash);
				cleaned++;
			}
		}

		if (cleaned > 0) {
			logger.debug('[NzbStreamService] Cleaned NZB cache', { cleaned });
		}
	}

	/**
	 * Shutdown the service.
	 */
	shutdown(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		this.nzbCache.clear();

		// Clear any pending cleanup timers
		for (const state of this.mountStreamStates.values()) {
			if (state.cleanupTimer) {
				clearTimeout(state.cleanupTimer);
			}
		}
		this.mountStreamStates.clear();

		// Also shutdown collaborators
		getStreamabilityChecker().shutdown();
		getExtractionCoordinator().shutdown();
	}
}

// Singleton instance
let instance: NzbStreamService | null = null;

/**
 * Get the singleton NzbStreamService.
 */
export function getNzbStreamService(): NzbStreamService {
	if (!instance) {
		instance = new NzbStreamService();
	}
	return instance;
}
