/**
 * OpenSubtitles.org Provider Module
 *
 * Legacy XML-RPC API provider for VIP users.
 */

import { OpenSubtitlesOrgProvider } from './OpenSubtitlesOrgProvider';
import { ORG_SUPPORTED_LANGUAGES } from './types';
import type { ProviderInfo } from '../registry';

export { OpenSubtitlesOrgProvider } from './OpenSubtitlesOrgProvider';
export * from './types';

/**
 * Provider information for auto-registration
 */
export const PROVIDER_INFO: ProviderInfo = {
	implementation: 'opensubtitlesorg',
	providerClass: OpenSubtitlesOrgProvider,
	definition: {
		implementation: 'opensubtitlesorg',
		name: 'OpenSubtitles.org (Legacy VIP)',
		description: 'Legacy XML-RPC API. Requires VIP subscription - deprecated for non-VIP users.',
		website: 'https://www.opensubtitles.org',
		requiresApiKey: false,
		requiresCredentials: true,
		accessType: 'vip',
		supportedLanguages: ORG_SUPPORTED_LANGUAGES,
		supportsHashSearch: true,
		features: ['VIP Only', 'Hash matching', 'Legacy API', 'High accuracy'],
		settings: [
			{
				key: 'username',
				label: 'Username',
				type: 'string',
				required: true,
				description: 'Your OpenSubtitles.org username'
			},
			{
				key: 'password',
				label: 'Password',
				type: 'string',
				required: true,
				description: 'Your OpenSubtitles.org password'
			},
			{
				key: 'vip',
				label: 'VIP Account',
				type: 'boolean',
				required: false,
				description: 'Enable for VIP API endpoint (faster, more reliable)'
			},
			{
				key: 'ssl',
				label: 'Use SSL',
				type: 'boolean',
				required: false,
				description: 'Use HTTPS for API requests (recommended)'
			},
			{
				key: 'skipWrongFps',
				label: 'Skip Wrong FPS',
				type: 'boolean',
				required: false,
				description: 'Skip subtitles with mismatched frame rate'
			}
		]
	}
};
