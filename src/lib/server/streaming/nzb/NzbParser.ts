/**
 * NzbParser - Parses NZB files to extract full segment information for streaming.
 *
 * Extends beyond validation to provide complete file and segment data
 * needed for direct NNTP streaming.
 */

import * as cheerio from 'cheerio';
import { logger } from '$lib/logging';
import { createHash } from 'crypto';
import { isMediaFile, isRarFile } from './constants';

/**
 * Segment information from NZB.
 */
export interface NzbSegment {
	/** Message ID (without angle brackets) */
	messageId: string;
	/** Segment number (1-based) */
	number: number;
	/** Segment size in bytes */
	bytes: number;
}

/**
 * File information from NZB.
 */
export interface NzbFile {
	/** File index (0-based) */
	index: number;
	/** Filename from subject */
	name: string;
	/** File poster */
	poster: string;
	/** Post date (Unix timestamp) */
	date: number;
	/** Subject line */
	subject: string;
	/** Usenet groups */
	groups: string[];
	/** Segments ordered by number */
	segments: NzbSegment[];
	/** Total size (sum of segment bytes) */
	size: number;
	/** Whether this appears to be a RAR file */
	isRar: boolean;
	/** RAR part number if multipart */
	rarPartNumber?: number;
}

/**
 * Parsed NZB result.
 */
export interface ParsedNzb {
	/** SHA256 hash of NZB content */
	hash: string;
	/** All files in the NZB */
	files: NzbFile[];
	/** Media files (video/audio) sorted for streaming */
	mediaFiles: NzbFile[];
	/** Total size of all files */
	totalSize: number;
	/** All unique groups referenced */
	groups: string[];
}

/**
 * Extract filename from subject line.
 * Subjects often have format: "description yEnc (1/10) filename.ext"
 */
function extractFilename(subject: string): string {
	// Try to find quoted filename
	const quotedMatch = subject.match(/"([^"]+)"/);
	if (quotedMatch) {
		return quotedMatch[1];
	}

	// Try yEnc format: "... yEnc (1/10) filename.ext"
	const yencMatch = subject.match(/yEnc\s*\(\d+\/\d+\)\s*(.+?)(?:\s*\[|$)/i);
	if (yencMatch) {
		return yencMatch[1].trim();
	}

	// Try to find filename with extension at end
	const extMatch = subject.match(/([^\s/\\]+\.[a-z0-9]{2,4})\s*$/i);
	if (extMatch) {
		return extMatch[1];
	}

	// Fall back to subject itself
	return subject.slice(0, 100);
}

/**
 * Extract RAR part number from filename.
 */
function extractRarPartNumber(filename: string): number | undefined {
	// .part01.rar, .part1.rar
	const partMatch = filename.match(/\.part(\d+)\.rar$/i);
	if (partMatch) {
		return parseInt(partMatch[1], 10);
	}

	// .r00, .r01 etc
	const rMatch = filename.match(/\.r(\d{2})$/i);
	if (rMatch) {
		return parseInt(rMatch[1], 10) + 1; // r00 = part 1
	}

	// .001, .002 etc
	const numMatch = filename.match(/\.(\d{3})$/);
	if (numMatch) {
		return parseInt(numMatch[1], 10);
	}

	// Single .rar is part 1
	if (filename.toLowerCase().endsWith('.rar')) {
		return 1;
	}

	return undefined;
}

/**
 * Parse an NZB file to extract full segment information.
 */
export function parseNzb(content: Buffer | string): ParsedNzb {
	const xml = typeof content === 'string' ? content : content.toString('utf-8');
	const hash = createHash('sha256').update(xml).digest('hex');

	const $ = cheerio.load(xml, { xmlMode: true });
	const root = $('nzb');

	if (root.length === 0) {
		throw new Error('Invalid NZB: No root <nzb> element found');
	}

	const fileElements = root.find('file');
	if (fileElements.length === 0) {
		throw new Error('Invalid NZB: No <file> elements found');
	}

	const files: NzbFile[] = [];
	const allGroups = new Set<string>();
	let totalSize = 0;

	fileElements.each((index, fileEl) => {
		const $file = $(fileEl);

		// Get file attributes
		const poster = $file.attr('poster') || '';
		const date = parseInt($file.attr('date') || '0', 10);
		const subject = $file.attr('subject') || '';

		// Extract filename from subject
		const name = extractFilename(subject);

		// Get groups
		const groups: string[] = [];
		$file.find('groups group').each((_, groupEl) => {
			const groupName = $(groupEl).text().trim();
			if (groupName) {
				groups.push(groupName);
				allGroups.add(groupName);
			}
		});

		// Get segments
		const segments: NzbSegment[] = [];
		let fileSize = 0;

		$file.find('segments segment').each((_, segmentEl) => {
			const $segment = $(segmentEl);
			const bytes = parseInt($segment.attr('bytes') || '0', 10);
			const number = parseInt($segment.attr('number') || '0', 10);
			const messageId = $segment.text().trim();

			if (messageId && number > 0) {
				segments.push({
					messageId,
					number,
					bytes
				});
				fileSize += bytes;
			}
		});

		// Sort segments by number
		segments.sort((a, b) => a.number - b.number);

		const isRar = isRarFile(name);
		const rarPartNumber = isRar ? extractRarPartNumber(name) : undefined;

		files.push({
			index,
			name,
			poster,
			date,
			subject,
			groups,
			segments,
			size: fileSize,
			isRar,
			rarPartNumber
		});

		totalSize += fileSize;
	});

	// Sort files by name for consistent ordering
	files.sort((a, b) => a.name.localeCompare(b.name));

	// Re-index after sort
	files.forEach((f, i) => {
		f.index = i;
	});

	// Identify media files for streaming
	const mediaFiles = files.filter((f) => isMediaFile(f.name) || f.isRar);

	// Sort media files: non-RAR first, then RARs by part number
	mediaFiles.sort((a, b) => {
		if (a.isRar !== b.isRar) {
			return a.isRar ? 1 : -1; // Non-RAR first
		}
		if (a.isRar && b.isRar) {
			return (a.rarPartNumber || 0) - (b.rarPartNumber || 0);
		}
		return a.name.localeCompare(b.name);
	});

	logger.debug('[NzbParser] Parsed NZB', {
		hash: hash.slice(0, 12),
		fileCount: files.length,
		mediaFileCount: mediaFiles.length,
		totalSize,
		groupCount: allGroups.size
	});

	return {
		hash,
		files,
		mediaFiles,
		totalSize,
		groups: Array.from(allGroups)
	};
}
