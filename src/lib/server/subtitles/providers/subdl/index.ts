/**
 * SubDL Provider Module
 *
 * Modern subtitle API with 60+ languages.
 */

import { SubDLProvider } from './SubDLProvider';
import { SUBDL_LANGUAGES } from './types';
import type { ProviderInfo } from '../registry';

export { SubDLProvider } from './SubDLProvider';
export * from './types';

/**
 * Provider information for auto-registration
 */
export const PROVIDER_INFO: ProviderInfo = {
	implementation: 'subdl',
	providerClass: SubDLProvider,
	definition: {
		implementation: 'subdl',
		name: 'SubDL',
		description: 'Modern subtitle API with excellent coverage and 60+ languages.',
		website: 'https://subdl.com',
		requiresApiKey: true,
		requiresCredentials: false,
		accessType: 'api-key',
		supportedLanguages: Object.keys(SUBDL_LANGUAGES),
		supportsHashSearch: false,
		features: ['60+ languages', 'IMDB/TMDB search', 'Modern API', 'Fast'],
		settings: [
			{
				key: 'apiKey',
				label: 'API Key',
				type: 'string',
				required: true,
				description: 'Get your free API key from subdl.com/api'
			}
		]
	}
};
