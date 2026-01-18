/**
 * Napiprojekt Provider Module
 *
 * Polish subtitle provider with hash matching.
 */

import { NapiprojektProvider } from './NapiprojektProvider';
import { NAPIPROJEKT_LANGUAGES } from './types';
import type { ProviderInfo } from '../registry';

export { NapiprojektProvider } from './NapiprojektProvider';
export * from './types';

/**
 * Provider information for auto-registration
 */
export const PROVIDER_INFO: ProviderInfo = {
	implementation: 'napiprojekt',
	providerClass: NapiprojektProvider,
	definition: {
		implementation: 'napiprojekt',
		name: 'Napiprojekt',
		description: 'Polish subtitle provider with hash-based matching.',
		website: 'https://www.napiprojekt.pl',
		requiresApiKey: false,
		requiresCredentials: false,
		accessType: 'free',
		supportedLanguages: NAPIPROJEKT_LANGUAGES,
		supportsHashSearch: true,
		features: ['Hash matching', 'Polish only', 'Movies & TV', 'Author filtering'],
		settings: [
			{
				key: 'onlyAuthors',
				label: 'Only Human Authors',
				type: 'boolean',
				required: false,
				description: 'Filter out AI/machine translated subtitles'
			},
			{
				key: 'onlyRealNames',
				label: 'Only Real Names',
				type: 'boolean',
				required: false,
				description: 'Only accept subtitles from authors with identifiable real names'
			}
		]
	}
};
