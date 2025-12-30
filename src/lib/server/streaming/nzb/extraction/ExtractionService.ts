/**
 * ExtractionService - Coordinates extraction of compressed archives.
 *
 * Detects archive type and routes to appropriate extractor.
 */

import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { logger } from '$lib/logging';
import type { ArchiveEntry, ExtractOptions, ExtractResult, Extractor } from './types';
import { RarExtractor } from './RarExtractor';
import { SevenZipExtractor } from './SevenZipExtractor';
import { ZipExtractor } from './ZipExtractor';
import { MEDIA_EXTENSIONS_NO_DOT_SET, MEDIA_EXTENSIONS_NO_DOT } from '../constants';

/**
 * Archive magic bytes for detection.
 */
const MAGIC_BYTES = {
	RAR4: Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]),
	RAR5: Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]),
	SEVENZIP: Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]),
	ZIP: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
	ZIP_EMPTY: Buffer.from([0x50, 0x4b, 0x05, 0x06]),
	ZIP_SPANNED: Buffer.from([0x50, 0x4b, 0x07, 0x08])
};

/**
 * Archive type enumeration.
 */
export type ArchiveType = 'rar' | '7z' | 'zip' | 'unknown';

/**
 * ExtractionService manages archive extraction.
 */
export class ExtractionService {
	private extractors: Map<ArchiveType, Extractor> = new Map();

	constructor() {
		this.extractors.set('rar', new RarExtractor());
		this.extractors.set('7z', new SevenZipExtractor());
		this.extractors.set('zip', new ZipExtractor());
	}

	/**
	 * Detect archive type from file header.
	 */
	async detectArchiveType(filePath: string): Promise<ArchiveType> {
		if (!existsSync(filePath)) {
			throw new Error(`File not found: ${filePath}`);
		}

		// Read first 16 bytes for magic byte detection
		const handle = await import('fs/promises').then((fs) => fs.open(filePath, 'r'));
		try {
			const buffer = Buffer.alloc(16);
			await handle.read(buffer, 0, 16, 0);

			return this.detectFromHeader(buffer);
		} finally {
			await handle.close();
		}
	}

	/**
	 * Detect archive type from header bytes.
	 */
	detectFromHeader(header: Buffer): ArchiveType {
		// Check RAR5 first (longer signature)
		if (header.length >= 8 && header.subarray(0, 8).equals(MAGIC_BYTES.RAR5)) {
			return 'rar';
		}

		// Check RAR4
		if (header.length >= 7 && header.subarray(0, 7).equals(MAGIC_BYTES.RAR4)) {
			return 'rar';
		}

		// Check 7z
		if (header.length >= 6 && header.subarray(0, 6).equals(MAGIC_BYTES.SEVENZIP)) {
			return '7z';
		}

		// Check ZIP variants
		if (header.length >= 4) {
			const zipHeader = header.subarray(0, 4);
			if (
				zipHeader.equals(MAGIC_BYTES.ZIP) ||
				zipHeader.equals(MAGIC_BYTES.ZIP_EMPTY) ||
				zipHeader.equals(MAGIC_BYTES.ZIP_SPANNED)
			) {
				return 'zip';
			}
		}

		return 'unknown';
	}

	/**
	 * List contents of an archive.
	 */
	async listEntries(filePath: string, password?: string): Promise<ArchiveEntry[]> {
		const type = await this.detectArchiveType(filePath);

		if (type === 'unknown') {
			throw new Error('Unknown archive format');
		}

		const extractor = this.extractors.get(type);
		if (!extractor) {
			throw new Error(`No extractor available for ${type}`);
		}

		return extractor.listEntries(filePath, password);
	}

	/**
	 * Extract archive to directory.
	 */
	async extract(
		filePath: string,
		outputDir: string,
		options?: ExtractOptions
	): Promise<ExtractResult> {
		const type = await this.detectArchiveType(filePath);

		if (type === 'unknown') {
			return {
				success: false,
				files: [],
				error: 'Unknown archive format'
			};
		}

		const extractor = this.extractors.get(type);
		if (!extractor) {
			return {
				success: false,
				files: [],
				error: `No extractor available for ${type}`
			};
		}

		// Ensure output directory exists
		await mkdir(outputDir, { recursive: true });

		logger.info('[ExtractionService] Starting extraction', {
			filePath,
			outputDir,
			type
		});

		try {
			const result = await extractor.extract(filePath, outputDir, options);

			if (result.success) {
				logger.info('[ExtractionService] Extraction complete', {
					filePath,
					filesExtracted: result.files.length
				});
			} else {
				logger.error('[ExtractionService] Extraction failed', {
					filePath,
					error: result.error
				});
			}

			return result;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			logger.error('[ExtractionService] Extraction error', {
				filePath,
				error: message
			});

			return {
				success: false,
				files: [],
				error: message
			};
		}
	}

	/**
	 * Find the largest media file in an archive.
	 */
	async findLargestMediaFile(filePath: string, password?: string): Promise<ArchiveEntry | null> {
		const entries = await this.listEntries(filePath, password);

		let largest: ArchiveEntry | null = null;
		let largestSize = 0;

		for (const entry of entries) {
			if (entry.isDirectory) continue;

			const ext = entry.path.toLowerCase().split('.').pop() || '';
			if (MEDIA_EXTENSIONS_NO_DOT_SET.has(ext) && entry.size > largestSize) {
				largest = entry;
				largestSize = entry.size;
			}
		}

		return largest;
	}

	/**
	 * Extract only media files from an archive.
	 */
	async extractMediaFiles(
		filePath: string,
		outputDir: string,
		options?: ExtractOptions
	): Promise<ExtractResult> {
		const include = MEDIA_EXTENSIONS_NO_DOT.map((ext) => new RegExp(`\\.${ext}$`, 'i'));

		return this.extract(filePath, outputDir, {
			...options,
			include
		});
	}
}

// Singleton instance
let instance: ExtractionService | null = null;

/**
 * Get the singleton ExtractionService.
 */
export function getExtractionService(): ExtractionService {
	if (!instance) {
		instance = new ExtractionService();
	}
	return instance;
}
