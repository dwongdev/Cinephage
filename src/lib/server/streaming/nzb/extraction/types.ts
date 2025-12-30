/**
 * Type definitions for NZB extraction pipeline.
 */

/**
 * Download progress event.
 */
export interface DownloadProgress {
	/** Current phase */
	phase: 'downloading' | 'extracting' | 'complete' | 'error';
	/** Total bytes to download */
	totalBytes: number;
	/** Bytes downloaded so far */
	downloadedBytes: number;
	/** Number of segments completed */
	segmentsCompleted: number;
	/** Total number of segments */
	totalSegments: number;
	/** Download speed in bytes per second */
	speedBps: number;
	/** Estimated time remaining in seconds */
	etaSeconds: number;
	/** Error message if phase is 'error' */
	error?: string;
}

/**
 * Download state for resume support.
 */
export interface DownloadState {
	/** Mount ID */
	mountId: string;
	/** Output file path */
	outputPath: string;
	/** Segments that have been downloaded */
	completedSegments: Set<number>;
	/** Total bytes written */
	bytesWritten: number;
	/** Last updated timestamp */
	lastUpdated: number;
	/** Whether download is complete */
	isComplete: boolean;
}

/**
 * Extraction progress event.
 */
export interface ExtractionProgress {
	/** Current phase */
	phase: 'extracting' | 'complete' | 'error';
	/** Archive type being extracted */
	archiveType: 'rar' | '7z' | 'zip';
	/** Total bytes to extract */
	totalBytes: number;
	/** Bytes extracted so far */
	extractedBytes: number;
	/** Current file being extracted */
	currentFile?: string;
	/** Error message if phase is 'error' */
	error?: string;
}

/**
 * Archive entry for listing contents.
 */
export interface ArchiveEntry {
	/** File path within archive */
	path: string;
	/** Uncompressed size in bytes */
	size: number;
	/** Whether file is encrypted */
	isEncrypted: boolean;
	/** Whether this is a directory */
	isDirectory: boolean;
	/** Compression method */
	method: number;
	/** CRC32 checksum */
	crc32?: number;
}

/**
 * Extraction options.
 */
export interface ExtractOptions {
	/** Password for encrypted archives */
	password?: string;
	/** Only extract files matching patterns */
	include?: RegExp[];
	/** Exclude files matching patterns */
	exclude?: RegExp[];
	/** Callback for progress updates */
	onProgress?: (progress: ExtractionProgress) => void;
}

/**
 * Extraction result.
 */
export interface ExtractResult {
	/** Whether extraction succeeded */
	success: boolean;
	/** Extracted files */
	files: ExtractedFile[];
	/** Error message if failed */
	error?: string;
}

/**
 * Extracted file info.
 */
export interface ExtractedFile {
	/** Original path in archive */
	archivePath: string;
	/** Path on disk */
	diskPath: string;
	/** File size */
	size: number;
}

/**
 * Common extractor interface.
 */
export interface Extractor {
	/** Check if extractor can handle this data */
	canExtract(header: Buffer): boolean;

	/** List archive contents without extracting */
	listEntries(inputPath: string, password?: string): Promise<ArchiveEntry[]>;

	/** Extract archive contents */
	extract(inputPath: string, outputDir: string, options?: ExtractOptions): Promise<ExtractResult>;
}
