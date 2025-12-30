/**
 * SevenZipExtractor - Extract 7z archives using 7z-wasm.
 *
 * Uses WASM-based 7-Zip for cross-platform compatibility.
 */

import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { spawn } from 'child_process';
import { logger } from '$lib/logging';
import type {
	ArchiveEntry,
	ExtractOptions,
	ExtractResult,
	ExtractedFile,
	Extractor
} from './types';

/**
 * SevenZipExtractor implements extraction using 7z-wasm CLI.
 */
export class SevenZipExtractor implements Extractor {
	/**
	 * Check if this extractor can handle the data.
	 */
	canExtract(header: Buffer): boolean {
		// 7z signature
		if (header.length >= 6) {
			const sig = Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);
			if (header.subarray(0, 6).equals(sig)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * List archive contents using 7z-wasm.
	 */
	async listEntries(filePath: string, password?: string): Promise<ArchiveEntry[]> {
		const entries: ArchiveEntry[] = [];

		try {
			const args = ['l', '-slt', filePath];
			if (password) {
				args.push(`-p${password}`);
			}

			const output = await this.run7z(args);
			const blocks = output.split('\n\n');

			for (const block of blocks) {
				if (!block.includes('Path = ')) continue;

				const lines = block.split('\n');
				let path = '';
				let size = 0;
				let isDir = false;
				let isEncrypted = false;
				let method = 0;

				for (const line of lines) {
					const [key, ...valueParts] = line.split(' = ');
					const value = valueParts.join(' = ').trim();

					switch (key.trim()) {
						case 'Path':
							path = value;
							break;
						case 'Size':
							size = parseInt(value, 10) || 0;
							break;
						case 'Folder':
							isDir = value === '+';
							break;
						case 'Encrypted':
							isEncrypted = value === '+';
							break;
						case 'Method':
							// Parse method from string like "LZMA2:24"
							method = value.includes('Store') ? 0 : 1;
							break;
					}
				}

				if (path) {
					entries.push({
						path,
						size,
						isDirectory: isDir,
						isEncrypted,
						method
					});
				}
			}
		} catch (error) {
			logger.error('[SevenZipExtractor] Failed to list entries', {
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
		const extractedFiles: ExtractedFile[] = [];

		try {
			// Ensure output directory exists
			await mkdir(outputDir, { recursive: true });

			// Build 7z command
			const args = ['x', '-y', `-o${outputDir}`, filePath];

			if (options?.password) {
				args.push(`-p${options.password}`);
			}

			// Run extraction
			await this.run7z(args);

			// Get list of extracted files
			const entries = await this.listEntries(filePath, options?.password);

			for (const entry of entries) {
				if (entry.isDirectory) continue;

				// Apply include/exclude filters
				if (options?.include && options.include.length > 0) {
					const matches = options.include.some((re) => re.test(entry.path));
					if (!matches) continue;
				}

				if (options?.exclude && options.exclude.length > 0) {
					const matches = options.exclude.some((re) => re.test(entry.path));
					if (matches) continue;
				}

				const diskPath = join(outputDir, entry.path);

				if (existsSync(diskPath)) {
					extractedFiles.push({
						archivePath: entry.path,
						diskPath,
						size: entry.size
					});

					logger.debug('[SevenZipExtractor] Extracted file', {
						name: entry.path,
						size: entry.size
					});
				}
			}

			// Progress callback
			if (options?.onProgress) {
				options.onProgress({
					phase: 'complete',
					archiveType: '7z',
					totalBytes: extractedFiles.reduce((sum, f) => sum + f.size, 0),
					extractedBytes: extractedFiles.reduce((sum, f) => sum + f.size, 0)
				});
			}

			logger.info('[SevenZipExtractor] Extraction complete', {
				archive: filePath,
				filesExtracted: extractedFiles.length
			});

			return {
				success: true,
				files: extractedFiles
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';

			logger.error('[SevenZipExtractor] Extraction failed', {
				archive: filePath,
				error: message
			});

			if (options?.onProgress) {
				options.onProgress({
					phase: 'error',
					archiveType: '7z',
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

	/**
	 * Run 7z-wasm command.
	 */
	private async run7z(args: string[]): Promise<string> {
		return new Promise((resolve, reject) => {
			// Use npx to run 7z-wasm
			const proc = spawn('npx', ['7z-wasm', ...args], {
				stdio: ['pipe', 'pipe', 'pipe']
			});

			let stdout = '';
			let stderr = '';

			proc.stdout.on('data', (data) => {
				stdout += data.toString();
			});

			proc.stderr.on('data', (data) => {
				stderr += data.toString();
			});

			proc.on('close', (code) => {
				if (code === 0) {
					resolve(stdout);
				} else {
					reject(new Error(stderr || `7z exited with code ${code}`));
				}
			});

			proc.on('error', (error) => {
				reject(error);
			});
		});
	}
}
