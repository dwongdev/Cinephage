/**
 * YIFY Subtitles Provider Module
 *
 * Popular movie subtitle database (movies only).
 */

import { YIFYSubtitlesProvider } from './YIFYSubtitlesProvider';
import { YIFY_LANGUAGES } from './types';
import type { ProviderInfo } from '../registry';

export { YIFYSubtitlesProvider } from './YIFYSubtitlesProvider';
export * from './types';

/**
 * Provider information for auto-registration
 */
export const PROVIDER_INFO: ProviderInfo = {
	implementation: 'yifysubtitles',
	providerClass: YIFYSubtitlesProvider,
	definition: {
		implementation: 'yifysubtitles',
		name: 'YIFY Subtitles',
		description: 'Popular movie subtitle database, movies only (no TV shows).',
		website: 'https://yifysubtitles.ch',
		requiresApiKey: false,
		requiresCredentials: false,
		accessType: 'free',
		supportedLanguages: Object.keys(YIFY_LANGUAGES),
		supportsHashSearch: false,
		features: ['Movies only', 'IMDB search', 'No API key required', 'Popular releases'],
		settings: []
	}
};
