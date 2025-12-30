/**
 * RarExtractor - Extract RAR archives using node-unrar-js.
 *
 * Uses WASM-based unrar for cross-platform compatibility.
 */

import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { logger } from '$lib/logging';
import type {
	ArchiveEntry,
	ExtractOptions,
	ExtractResult,
	ExtractedFile,
	Extractor
} from './types';

/**
 * RarExtractor implements extraction using node-unrar-js.
 */
export class RarExtractor implements Extractor {
	/**
	 * Check if this extractor can handle the data.
	 */
	canExtract(header: Buffer): boolean {
		// RAR5 signature
		if (header.length >= 8) {
			const rar5 = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]);
			if (header.subarray(0, 8).equals(rar5)) {
				return true;
			}
		}

		// RAR4 signature
		if (header.length >= 7) {
			const rar4 = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]);
			if (header.subarray(0, 7).equals(rar4)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * List archive contents.
	 */
	async listEntries(filePath: string, password?: string): Promise<ArchiveEntry[]> {
		const { createExtractorFromFile } = await import('node-unrar-js');

		const extractor = await createExtractorFromFile({
			filepath: filePath,
			password
		});

		const list = extractor.getFileList();
		const entries: ArchiveEntry[] = [];

		for (const header of list.fileHeaders) {
			// Parse CRC and method which may be strings
			const crcValue = header.crc;
			const methodValue = header.method;

			entries.push({
				path: header.name,
				size: header.unpSize,
				isEncrypted: header.flags.encrypted,
				isDirectory: header.flags.directory,
				method:
					typeof methodValue === 'string' ? parseInt(methodValue, 10) : (methodValue as number),
				crc32: typeof crcValue === 'string' ? parseInt(crcValue, 16) : (crcValue as number)
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
		const { createExtractorFromFile } = await import('node-unrar-js');
		const extractedFiles: ExtractedFile[] = [];

		try {
			const extractor = await createExtractorFromFile({
				filepath: filePath,
				targetPath: outputDir,
				password: options?.password
			});

			// Get file list for filtering
			const list = extractor.getFileList();
			const filesToExtract: string[] = [];

			for (const header of list.fileHeaders) {
				if (header.flags.directory) continue;

				// Apply include/exclude filters
				if (options?.include && options.include.length > 0) {
					const matches = options.include.some((re) => re.test(header.name));
					if (!matches) continue;
				}

				if (options?.exclude && options.exclude.length > 0) {
					const matches = options.exclude.some((re) => re.test(header.name));
					if (matches) continue;
				}

				filesToExtract.push(header.name);
			}

			if (filesToExtract.length === 0) {
				return {
					success: true,
					files: [],
					error: 'No files matched extraction criteria'
				};
			}

			// Extract files
			const extracted = extractor.extract({
				files: filesToExtract
			});

			// Process extracted files
			for (const file of extracted.files) {
				if (file.extraction) {
					const diskPath = join(outputDir, file.fileHeader.name);

					// Ensure directory exists
					await mkdir(dirname(diskPath), { recursive: true });

					// Write file
					await writeFile(diskPath, Buffer.from(file.extraction));

					extractedFiles.push({
						archivePath: file.fileHeader.name,
						diskPath,
						size: file.fileHeader.unpSize
					});

					logger.debug('[RarExtractor] Extracted file', {
						name: file.fileHeader.name,
						size: file.fileHeader.unpSize
					});

					// Progress callback
					if (options?.onProgress) {
						const totalSize = list.fileHeaders.reduce(
							(sum, h) => sum + (h.flags.directory ? 0 : h.unpSize),
							0
						);
						const extractedSize = extractedFiles.reduce((sum, f) => sum + f.size, 0);

						options.onProgress({
							phase: 'extracting',
							archiveType: 'rar',
							totalBytes: totalSize,
							extractedBytes: extractedSize,
							currentFile: file.fileHeader.name
						});
					}
				}
			}

			// Final progress update
			if (options?.onProgress) {
				options.onProgress({
					phase: 'complete',
					archiveType: 'rar',
					totalBytes: extractedFiles.reduce((sum, f) => sum + f.size, 0),
					extractedBytes: extractedFiles.reduce((sum, f) => sum + f.size, 0)
				});
			}

			logger.info('[RarExtractor] Extraction complete', {
				archive: filePath,
				filesExtracted: extractedFiles.length
			});

			return {
				success: true,
				files: extractedFiles
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';

			logger.error('[RarExtractor] Extraction failed', {
				archive: filePath,
				error: message
			});

			if (options?.onProgress) {
				options.onProgress({
					phase: 'error',
					archiveType: 'rar',
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
