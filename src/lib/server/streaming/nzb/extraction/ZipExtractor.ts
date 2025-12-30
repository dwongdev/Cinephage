/**
 * ZipExtractor - Extract ZIP archives using unzipper.
 */

import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { pipeline } from 'stream/promises';
import { logger } from '$lib/logging';
import type {
	ArchiveEntry,
	ExtractOptions,
	ExtractResult,
	ExtractedFile,
	Extractor
} from './types';

/**
 * ZipExtractor implements extraction using unzipper.
 */
export class ZipExtractor implements Extractor {
	/**
	 * Check if this extractor can handle the data.
	 */
	canExtract(header: Buffer): boolean {
		if (header.length >= 4) {
			// ZIP signature (PK..)
			const pk = header.subarray(0, 2);
			if (pk[0] === 0x50 && pk[1] === 0x4b) {
				const type = header.subarray(2, 4);
				// Local file header, empty archive, or spanned marker
				if (
					(type[0] === 0x03 && type[1] === 0x04) ||
					(type[0] === 0x05 && type[1] === 0x06) ||
					(type[0] === 0x07 && type[1] === 0x08)
				) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * List archive contents.
	 */
	async listEntries(filePath: string, _password?: string): Promise<ArchiveEntry[]> {
		const unzipper = await import('unzipper');
		const entries: ArchiveEntry[] = [];

		try {
			const directory = await unzipper.Open.file(filePath);

			for (const file of directory.files) {
				// Cast through unknown to access potentially missing properties
				const fileAny = file as unknown as Record<string, unknown>;

				entries.push({
					path: file.path,
					size: file.uncompressedSize,
					isDirectory: file.type === 'Directory',
					isEncrypted: Boolean(fileAny.isEncrypted ?? fileAny.encrypted ?? false),
					method: typeof fileAny.compressionMethod === 'number' ? fileAny.compressionMethod : 0
				});
			}
		} catch (error) {
			logger.error('[ZipExtractor] Failed to list entries', {
				archive: filePath,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}

		return entries;
	}

	/**
	 * Extract archive contents.
	 */
	async extract(
		filePath: string,
		outputDir: string,
		options?: ExtractOptions
	): Promise<ExtractResult> {
		const unzipper = await import('unzipper');
		const extractedFiles: ExtractedFile[] = [];

		try {
			// Ensure output directory exists
			await mkdir(outputDir, { recursive: true });

			const directory = await unzipper.Open.file(filePath);

			let totalBytes = 0;
			let extractedBytes = 0;

			// Calculate total size
			for (const file of directory.files) {
				if (file.type !== 'Directory') {
					totalBytes += file.uncompressedSize;
				}
			}

			for (const file of directory.files) {
				if (file.type === 'Directory') continue;

				// Apply include/exclude filters
				if (options?.include && options.include.length > 0) {
					const matches = options.include.some((re) => re.test(file.path));
					if (!matches) continue;
				}

				if (options?.exclude && options.exclude.length > 0) {
					const matches = options.exclude.some((re) => re.test(file.path));
					if (matches) continue;
				}

				const diskPath = join(outputDir, file.path);

				// Ensure directory exists
				await mkdir(dirname(diskPath), { recursive: true });

				// Extract file
				const writeStream = createWriteStream(diskPath);
				await pipeline(file.stream(options?.password), writeStream);

				extractedFiles.push({
					archivePath: file.path,
					diskPath,
					size: file.uncompressedSize
				});

				extractedBytes += file.uncompressedSize;

				logger.debug('[ZipExtractor] Extracted file', {
					name: file.path,
					size: file.uncompressedSize
				});

				// Progress callback
				if (options?.onProgress) {
					options.onProgress({
						phase: 'extracting',
						archiveType: 'zip',
						totalBytes,
						extractedBytes,
						currentFile: file.path
					});
				}
			}

			// Final progress update
			if (options?.onProgress) {
				options.onProgress({
					phase: 'complete',
					archiveType: 'zip',
					totalBytes,
					extractedBytes
				});
			}

			logger.info('[ZipExtractor] Extraction complete', {
				archive: filePath,
				filesExtracted: extractedFiles.length
			});

			return {
				success: true,
				files: extractedFiles
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';

			logger.error('[ZipExtractor] Extraction failed', {
				archive: filePath,
				error: message
			});

			if (options?.onProgress) {
				options.onProgress({
					phase: 'error',
					archiveType: 'zip',
					totalBytes: 0,
					extractedBytes: 0,
					error: message
				});
			}

			return {
				success: false,
				files: extractedFiles,
				error: message
			};
		}
	}
}
