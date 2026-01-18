/**
 * OpenSubtitles.org Provider Types
 *
 * Legacy XML-RPC API types for VIP users
 */

/**
 * XML-RPC method response wrapper
 */
export interface XmlRpcResponse<T> {
	status: string;
	data: T;
	seconds?: number;
}

/**
 * Login response
 */
export interface LoginResponse {
	token: string;
	status: string;
	seconds: number;
}

/**
 * Subtitle search result from XML-RPC
 */
export interface OrgSubtitleResult {
	IDSubtitleFile: string;
	SubFileName: string;
	SubLanguageID: string;
	SubFormat: string;
	SubEncoding: string;
	SubHash: string;
	MovieHash: string;
	MovieByteSize: string;
	MovieTimeMS: string;
	MovieFPS: string;
	IDMovie: string;
	IDMovieImdb: string;
	MovieName: string;
	MovieYear: string;
	SeriesSeason: string;
	SeriesEpisode: string;
	MovieReleaseName: string;
	SubDownloadsCnt: string;
	SubRating: string;
	SubHearingImpaired: string;
	SubForeignPartsOnly: string;
	SubDownloadLink: string;
	ZipDownloadLink: string;
	SubtitlesLink: string;
	QueryNumber: string;
	Score: string;
	UserID: string;
	UserNickName: string;
	MatchedBy: string;
}

/**
 * Search parameters
 */
export interface OrgSearchParams {
	sublanguageid: string;
	moviehash?: string;
	moviebytesize?: number;
	imdbid?: string;
	query?: string;
	season?: number;
	episode?: number;
}

/**
 * Download response data item
 */
export interface OrgDownloadDataItem {
	idsubtitlefile: string;
	data: string; // Base64 + gzip encoded subtitle content
}

/**
 * Provider configuration
 */
export interface OpenSubtitlesOrgConfig {
	username: string;
	password: string;
	vip: boolean;
	ssl: boolean;
	skipWrongFps: boolean;
}

/**
 * Supported languages with ISO 639-2/B codes (what XML-RPC uses)
 */
export const ORG_LANGUAGE_MAP: Record<string, string> = {
	en: 'eng',
	es: 'spa',
	fr: 'fre',
	de: 'ger',
	it: 'ita',
	pt: 'por',
	'pt-br': 'pob',
	nl: 'dut',
	pl: 'pol',
	ru: 'rus',
	ar: 'ara',
	he: 'heb',
	tr: 'tur',
	el: 'ell',
	hu: 'hun',
	ro: 'rum',
	cs: 'cze',
	sv: 'swe',
	da: 'dan',
	fi: 'fin',
	no: 'nor',
	ja: 'jpn',
	ko: 'kor',
	zh: 'chi',
	'zh-cn': 'chi',
	'zh-tw': 'zht',
	vi: 'vie',
	th: 'tha',
	id: 'ind',
	ms: 'may',
	fa: 'per',
	hi: 'hin',
	bn: 'ben',
	uk: 'ukr',
	bg: 'bul',
	hr: 'hrv',
	sr: 'scc',
	sk: 'slo',
	sl: 'slv',
	et: 'est',
	lv: 'lav',
	lt: 'lit'
};

/**
 * Reverse language map
 */
export const ORG_LANGUAGE_REVERSE: Record<string, string> = Object.fromEntries(
	Object.entries(ORG_LANGUAGE_MAP).map(([k, v]) => [v, k])
);

/**
 * All supported language codes
 */
export const ORG_SUPPORTED_LANGUAGES = Object.keys(ORG_LANGUAGE_MAP);
