/**
 * Betaseries Provider Module
 *
 * French subtitle provider for TV shows.
 */

import { BetaseriesProvider } from './BetaseriesProvider';
import { BETASERIES_LANGUAGES } from './types';
import type { ProviderInfo } from '../registry';

export { BetaseriesProvider } from './BetaseriesProvider';
export * from './types';

/**
 * Provider information for auto-registration
 */
export const PROVIDER_INFO: ProviderInfo = {
	implementation: 'betaseries',
	providerClass: BetaseriesProvider,
	definition: {
		implementation: 'betaseries',
		name: 'Betaseries',
		description: 'French subtitle provider for TV shows with TVDB matching.',
		website: 'https://www.betaseries.com',
		requiresApiKey: true,
		requiresCredentials: false,
		accessType: 'api-key',
		supportedLanguages: BETASERIES_LANGUAGES,
		supportsHashSearch: false,
		features: ['French/English', 'TV shows only', 'TVDB search', 'API-based'],
		settings: [
			{
				key: 'token',
				label: 'API Token',
				type: 'string',
				required: true,
				description: 'Your Betaseries API token'
			}
		]
	}
};
