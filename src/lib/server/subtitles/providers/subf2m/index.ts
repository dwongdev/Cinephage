/**
 * Subf2m Provider Module
 *
 * Large subtitle database with 50+ languages.
 */

import { Subf2mProvider } from './Subf2mProvider';
import { SUBF2M_LANGUAGES } from './types';
import type { ProviderInfo } from '../registry';

export { Subf2mProvider } from './Subf2mProvider';
export * from './types';

/**
 * Provider information for auto-registration
 */
export const PROVIDER_INFO: ProviderInfo = {
	implementation: 'subf2m',
	providerClass: Subf2mProvider,
	definition: {
		implementation: 'subf2m',
		name: 'Subf2m',
		description: 'Large subtitle database with movies and TV shows.',
		website: 'https://subf2m.co',
		requiresApiKey: false,
		requiresCredentials: false,
		accessType: 'free',
		supportedLanguages: Object.keys(SUBF2M_LANGUAGES),
		supportsHashSearch: false,
		features: ['Large catalog', 'Movies & TV', 'No API key required', '50+ languages'],
		settings: []
	}
};
