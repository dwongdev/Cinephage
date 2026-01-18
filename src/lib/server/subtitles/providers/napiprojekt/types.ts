/**
 * Napiprojekt Types
 *
 * Polish subtitle provider using MD5-based hash matching.
 */

/** Napiprojekt API response */
export interface NapiprojektSearchResult {
	hash: string;
	content: Buffer;
	author?: string;
	resolution?: string;
	fps?: string;
	size?: string;
	addedDate?: string;
	length?: string;
}

/** Search params */
export interface NapiprojektSearchParams {
	hash: string;
	language: string;
}

/** Provider configuration */
export interface NapiprojektConfig {
	/** Only accept subtitles from human authors (filter out AI/machine translations) */
	onlyAuthors?: boolean;
	/** Only accept subtitles from authors with real names (2+ uppercase letters) */
	onlyRealNames?: boolean;
}

/** Napiprojekt only supports Polish */
export const NAPIPROJEKT_LANGUAGES = ['pl'];

/**
 * Calculate Napiprojekt hash (NapiProjekt uses MD5 of first 10MB)
 */
export async function calculateNapiprojektHash(buffer: Buffer): Promise<string> {
	const crypto = await import('crypto');
	// Use first 10MB (10485760 bytes)
	const chunk = buffer.subarray(0, 10485760);
	return crypto.createHash('md5').update(chunk).digest('hex');
}

/**
 * Calculate sub-hash (used for authentication)
 */
export function calculateSubHash(hash: string): string {
	const indices = [0xe, 0x3, 0x6, 0x8, 0x2];
	const add = [0x0, 0xd, 0x10, 0xb, 0x5];

	let result = '';
	for (let i = 0; i < indices.length; i++) {
		const idx = indices[i];
		const a = add[i];
		const char = hash.charAt(idx);
		const charCode = parseInt(char, 16);
		result += ((charCode + a) % 16).toString(16);
	}

	return result;
}

/** Machine translator keywords to filter */
export const MACHINE_TRANSLATOR_KEYWORDS = [
	'brak',
	'automat',
	'si',
	'chatgpt',
	'ai',
	'robot',
	'maszynowe',
	'tłumaczenie maszynowe'
];
