/**
 * NzbDownloader - Downloads NZB content to local storage.
 *
 * Downloads all segments in parallel with progress tracking and resume support.
 */

import { createWriteStream, existsSync, unlinkSync } from 'fs';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { logger } from '$lib/logging';
import type { NntpClientManager } from '../nntp/NntpClientManager';
import type { NzbFile, NzbSegment } from '../NzbParser';
import type { DownloadProgress, DownloadState } from './types';

/**
 * Maximum concurrent segment downloads.
 */
const MAX_CONCURRENT_DOWNLOADS = 10;

/**
 * Progress update interval in ms.
 */
const PROGRESS_UPDATE_INTERVAL = 500;

/**
 * Download options.
 */
export interface DownloadOptions {
	/** Output file path */
	outputPath: string;
	/** Callback for progress updates */
	onProgress?: (progress: DownloadProgress) => void;
	/** Signal for cancellation */
	signal?: AbortSignal;
	/** Resume from previous state if available */
	resume?: boolean;
}

/**
 * Download result.
 */
export interface DownloadResult {
	/** Whether download succeeded */
	success: boolean;
	/** Output file path */
	outputPath: string;
	/** Total bytes downloaded */
	totalBytes: number;
	/** Error message if failed */
	error?: string;
}

/**
 * Segment download task.
 */
interface SegmentTask {
	index: number;
	segment: NzbSegment;
	fileIndex: number;
	offsetInFile: number;
}

/**
 * NzbDownloader handles parallel segment downloads.
 */
export class NzbDownloader {
	private clientManager: NntpClientManager;
	private stateDir: string;

	constructor(clientManager: NntpClientManager, stateDir: string = '/tmp/cinephage-downloads') {
		this.clientManager = clientManager;
		this.stateDir = stateDir;
	}

	/**
	 * Download all files from an NZB to a single output file.
	 * Used for RAR archives that span multiple NZB files.
	 */
	async downloadFiles(files: NzbFile[], options: DownloadOptions): Promise<DownloadResult> {
		const { outputPath, onProgress, signal, resume = true } = options;

		// Ensure output directory exists
		await mkdir(dirname(outputPath), { recursive: true });

		// Build segment task list
		const tasks = this.buildSegmentTasks(files);
		const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
		const totalSegments = tasks.length;

		// Load or create download state
		const stateFile = this.getStateFilePath(outputPath);
		let state = resume ? await this.loadState(stateFile) : null;

		if (!state) {
			state = {
				mountId: '',
				outputPath,
				completedSegments: new Set(),
				bytesWritten: 0,
				lastUpdated: Date.now(),
				isComplete: false
			};
		}

		// Check if already complete
		if (state.isComplete && existsSync(outputPath)) {
			logger.info('[NzbDownloader] Download already complete', { outputPath });
			return {
				success: true,
				outputPath,
				totalBytes: state.bytesWritten
			};
		}

		// Progress tracking
		let downloadedBytes = state.bytesWritten;
		let segmentsCompleted = state.completedSegments.size;
		const startTime = Date.now();
		let lastProgressUpdate = 0;

		const updateProgress = (phase: DownloadProgress['phase'], error?: string) => {
			const now = Date.now();
			if (now - lastProgressUpdate < PROGRESS_UPDATE_INTERVAL && phase === 'downloading') {
				return;
			}
			lastProgressUpdate = now;

			const elapsedSeconds = (now - startTime) / 1000;
			const speedBps = elapsedSeconds > 0 ? downloadedBytes / elapsedSeconds : 0;
			const remainingBytes = totalBytes - downloadedBytes;
			const etaSeconds = speedBps > 0 ? remainingBytes / speedBps : 0;

			onProgress?.({
				phase,
				totalBytes,
				downloadedBytes,
				segmentsCompleted,
				totalSegments,
				speedBps,
				etaSeconds,
				error
			});
		};

		// Create write buffer for segment data
		const segmentBuffers: Map<number, Buffer> = new Map();
		let nextSegmentToWrite = 0;

		// Open output file for writing
		const writeStream = createWriteStream(outputPath, {
			flags: state.bytesWritten > 0 ? 'r+' : 'w',
			start: state.bytesWritten
		});

		try {
			updateProgress('downloading');

			// Filter out already completed segments
			const pendingTasks = tasks.filter((t) => !state!.completedSegments.has(t.index));

			// Download segments in parallel with concurrency limit
			await this.downloadWithConcurrency(pendingTasks, MAX_CONCURRENT_DOWNLOADS, async (task) => {
				if (signal?.aborted) {
					throw new Error('Download cancelled');
				}

				try {
					const result = await this.clientManager.getDecodedArticle(task.segment.messageId);

					// Store buffer
					segmentBuffers.set(task.index, result.data);

					// Update progress
					downloadedBytes += result.data.length;
					segmentsCompleted++;
					state!.completedSegments.add(task.index);

					// Write sequential segments
					while (segmentBuffers.has(nextSegmentToWrite)) {
						const buffer = segmentBuffers.get(nextSegmentToWrite)!;
						writeStream.write(buffer);
						segmentBuffers.delete(nextSegmentToWrite);
						state!.bytesWritten += buffer.length;
						nextSegmentToWrite++;
					}

					updateProgress('downloading');
				} catch (error) {
					logger.error('[NzbDownloader] Segment download failed', {
						index: task.index,
						messageId: task.segment.messageId.slice(0, 20),
						error: error instanceof Error ? error.message : 'Unknown error'
					});
					throw error;
				}
			});

			// Write any remaining buffered segments
			while (segmentBuffers.size > 0) {
				if (segmentBuffers.has(nextSegmentToWrite)) {
					const buffer = segmentBuffers.get(nextSegmentToWrite)!;
					writeStream.write(buffer);
					segmentBuffers.delete(nextSegmentToWrite);
					state.bytesWritten += buffer.length;
					nextSegmentToWrite++;
				} else {
					break;
				}
			}

			// Wait for stream to finish
			await new Promise<void>((resolve, reject) => {
				writeStream.end((err: Error | null) => {
					if (err) reject(err);
					else resolve();
				});
			});

			// Mark as complete
			state.isComplete = true;
			state.lastUpdated = Date.now();
			await this.saveState(stateFile, state);

			updateProgress('complete');

			logger.info('[NzbDownloader] Download complete', {
				outputPath,
				totalBytes: state.bytesWritten,
				segments: totalSegments
			});

			return {
				success: true,
				outputPath,
				totalBytes: state.bytesWritten
			};
		} catch (error) {
			writeStream.end();

			// Save state for resume
			state.lastUpdated = Date.now();
			await this.saveState(stateFile, state);

			const message = error instanceof Error ? error.message : 'Unknown error';
			updateProgress('error', message);

			logger.error('[NzbDownloader] Download failed', {
				outputPath,
				error: message,
				completedSegments: segmentsCompleted,
				totalSegments
			});

			return {
				success: false,
				outputPath,
				totalBytes: downloadedBytes,
				error: message
			};
		}
	}

	/**
	 * Download a single NZB file.
	 */
	async downloadFile(file: NzbFile, options: DownloadOptions): Promise<DownloadResult> {
		return this.downloadFiles([file], options);
	}

	/**
	 * Build segment tasks from NZB files.
	 */
	private buildSegmentTasks(files: NzbFile[]): SegmentTask[] {
		const tasks: SegmentTask[] = [];
		let globalIndex = 0;
		let fileOffset = 0;

		for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
			const file = files[fileIndex];
			let segmentOffset = 0;

			for (const segment of file.segments) {
				tasks.push({
					index: globalIndex++,
					segment,
					fileIndex,
					offsetInFile: fileOffset + segmentOffset
				});
				segmentOffset += segment.bytes;
			}

			fileOffset += file.size;
		}

		return tasks;
	}

	/**
	 * Execute tasks with concurrency limit.
	 */
	private async downloadWithConcurrency<T>(
		tasks: T[],
		concurrency: number,
		executor: (task: T) => Promise<void>
	): Promise<void> {
		const executing: Promise<void>[] = [];

		for (const task of tasks) {
			const promise = executor(task).then(() => {
				executing.splice(executing.indexOf(promise), 1);
			});
			executing.push(promise);

			if (executing.length >= concurrency) {
				await Promise.race(executing);
			}
		}

		await Promise.all(executing);
	}

	/**
	 * Get state file path for a download.
	 */
	private getStateFilePath(outputPath: string): string {
		const hash = Buffer.from(outputPath).toString('base64url').slice(0, 32);
		return join(this.stateDir, `${hash}.state.json`);
	}

	/**
	 * Load download state from file.
	 */
	private async loadState(stateFile: string): Promise<DownloadState | null> {
		try {
			if (!existsSync(stateFile)) {
				return null;
			}

			const data = await readFile(stateFile, 'utf8');
			const parsed = JSON.parse(data);

			return {
				...parsed,
				completedSegments: new Set(parsed.completedSegments)
			};
		} catch {
			return null;
		}
	}

	/**
	 * Save download state to file.
	 */
	private async saveState(stateFile: string, state: DownloadState): Promise<void> {
		try {
			await mkdir(this.stateDir, { recursive: true });

			const data = {
				...state,
				completedSegments: Array.from(state.completedSegments)
			};

			await writeFile(stateFile, JSON.stringify(data), 'utf8');
		} catch (error) {
			logger.warn('[NzbDownloader] Failed to save state', {
				stateFile,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	}

	/**
	 * Clean up state file for a completed download.
	 */
	async cleanupState(outputPath: string): Promise<void> {
		const stateFile = this.getStateFilePath(outputPath);
		try {
			if (existsSync(stateFile)) {
				unlinkSync(stateFile);
			}
		} catch {
			// Ignore cleanup errors
		}
	}
}
