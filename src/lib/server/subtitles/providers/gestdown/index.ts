/**
 * Gestdown Provider Module
 *
 * TV show subtitle database using TVDB.
 */

import { GestdownProvider } from './GestdownProvider';
import { GESTDOWN_LANGUAGES } from './types';
import type { ProviderInfo } from '../registry';

export { GestdownProvider } from './GestdownProvider';
export * from './types';

/**
 * Provider information for auto-registration
 */
export const PROVIDER_INFO: ProviderInfo = {
	implementation: 'gestdown',
	providerClass: GestdownProvider,
	definition: {
		implementation: 'gestdown',
		name: 'Gestdown',
		description: 'TV show subtitle database, TV shows only (uses TVDB).',
		website: 'https://api.gestdown.info',
		requiresApiKey: false,
		requiresCredentials: false,
		accessType: 'free',
		supportedLanguages: Object.keys(GESTDOWN_LANGUAGES),
		supportsHashSearch: false,
		features: ['TV shows only', 'JSON API', 'No API key required', 'European languages'],
		settings: []
	}
};
