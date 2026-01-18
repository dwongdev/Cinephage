/**
 * Legendasdivx Types
 *
 * Portuguese subtitle provider (Portugal).
 */

/** Search result from Legendasdivx */
export interface LegendasdivxResult {
	link: string;
	hits: number;
	exactMatch: boolean;
	description: string;
	frameRate?: string;
	uploader?: string;
}

/** Provider configuration */
export interface LegendasdivxConfig {
	username: string;
	password: string;
	/** Skip subtitles with wrong FPS (default: true) */
	skipWrongFps?: boolean;
}

/** Only Portuguese supported */
export const LEGENDASDIVX_LANGUAGES = ['pt'];

/** Base URL */
export const LEGENDASDIVX_BASE_URL = 'https://www.legendasdivx.pt';
