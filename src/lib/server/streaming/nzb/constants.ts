/**
 * NZB Streaming Constants
 *
 * Shared constants for the NZB streaming subsystem.
 */

/**
 * Common video file extensions (with leading dot).
 */
export const VIDEO_EXTENSIONS = new Set([
	'.mkv',
	'.mp4',
	'.avi',
	'.mov',
	'.wmv',
	'.flv',
	'.webm',
	'.m4v',
	'.mpg',
	'.mpeg',
	'.ts',
	'.m2ts',
	'.vob'
]);

/**
 * Common audio file extensions (with leading dot).
 */
export const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.aac', '.ogg', '.wav', '.m4a', '.wma']);

/**
 * All media file extensions (video + audio).
 */
export const MEDIA_EXTENSIONS = new Set([...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS]);

/**
 * Media extensions as Set without dots (for file extension lookups).
 */
export const MEDIA_EXTENSIONS_NO_DOT_SET = new Set([
	'mkv',
	'mp4',
	'avi',
	'mov',
	'wmv',
	'flv',
	'webm',
	'm4v',
	'mpg',
	'mpeg',
	'ts',
	'm2ts',
	'vob',
	'mp3',
	'flac',
	'aac',
	'ogg',
	'wav',
	'm4a',
	'wma'
]);

/**
 * Media extensions as array without dots (for regex patterns).
 */
export const MEDIA_EXTENSIONS_NO_DOT = [
	'mkv',
	'mp4',
	'avi',
	'mov',
	'wmv',
	'flv',
	'webm',
	'm4v',
	'mpg',
	'mpeg',
	'ts',
	'm2ts',
	'vob',
	'mp3',
	'flac',
	'aac',
	'ogg',
	'wav',
	'm4a',
	'wma'
];

/**
 * RAR file patterns for detection.
 */
export const RAR_PATTERNS = [
	/\.rar$/i,
	/\.r\d{2}$/i,
	/\.part\d+\.rar$/i,
	/\.\d{3}$/ // .001, .002 etc
];

/**
 * Check if a filename is a media file (video or audio).
 */
export function isMediaFile(filename: string): boolean {
	const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
	return MEDIA_EXTENSIONS.has(ext);
}

/**
 * Check if a filename is a video file.
 */
export function isVideoFile(filename: string): boolean {
	const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
	return VIDEO_EXTENSIONS.has(ext);
}

/**
 * Check if a filename is a RAR archive (including multi-part).
 */
export function isRarFile(filename: string): boolean {
	return RAR_PATTERNS.some((pattern) => pattern.test(filename));
}

/**
 * MIME type mappings for media files.
 */
export const CONTENT_TYPE_MAP: Record<string, string> = {
	// Video
	mkv: 'video/x-matroska',
	mp4: 'video/mp4',
	avi: 'video/x-msvideo',
	mov: 'video/quicktime',
	wmv: 'video/x-ms-wmv',
	flv: 'video/x-flv',
	webm: 'video/webm',
	m4v: 'video/x-m4v',
	mpg: 'video/mpeg',
	mpeg: 'video/mpeg',
	ts: 'video/mp2t',
	m2ts: 'video/mp2t',
	vob: 'video/dvd',
	// Audio
	mp3: 'audio/mpeg',
	flac: 'audio/flac',
	aac: 'audio/aac',
	ogg: 'audio/ogg',
	wav: 'audio/wav',
	m4a: 'audio/x-m4a',
	wma: 'audio/x-ms-wma'
};

/**
 * Get content type from filename.
 */
export function getContentType(filename: string): string {
	const ext = filename.toLowerCase().split('.').pop() || '';
	return CONTENT_TYPE_MAP[ext] || 'application/octet-stream';
}
