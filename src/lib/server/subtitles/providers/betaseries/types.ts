/**
 * Betaseries Types
 *
 * French subtitle provider for TV shows.
 */

/** Betaseries API response */
export interface BetaseriesResponse {
	episode?: BetaseriesEpisode;
	subtitles?: BetaseriesSubtitle[];
	errors?: Array<{ code: number; text: string }>;
}

/** Betaseries episode */
export interface BetaseriesEpisode {
	id: number;
	thetvdb_id?: number;
	title: string;
	season: number;
	episode: number;
	subtitles?: BetaseriesSubtitle[];
}

/** Betaseries subtitle */
export interface BetaseriesSubtitle {
	id: number;
	language: string;
	source: string;
	file: string;
	url: string;
	quality?: number;
	content?: string;
}

/** Provider configuration */
export interface BetaseriesConfig {
	/** API token (required) */
	token: string;
}

/** Supported languages (French and English) */
export const BETASERIES_LANGUAGES = ['fr', 'en'];

/** API base URL */
export const BETASERIES_API_URL = 'https://api.betaseries.com/';
