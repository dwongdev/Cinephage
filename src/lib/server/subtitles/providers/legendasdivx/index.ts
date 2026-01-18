/**
 * Legendasdivx Provider Module
 *
 * Portuguese subtitle provider (Portugal).
 */

import { LegendasdivxProvider } from './LegendasdivxProvider';
import { LEGENDASDIVX_LANGUAGES } from './types';
import type { ProviderInfo } from '../registry';

export { LegendasdivxProvider } from './LegendasdivxProvider';
export * from './types';

/**
 * Provider information for auto-registration
 */
export const PROVIDER_INFO: ProviderInfo = {
	implementation: 'legendasdivx',
	providerClass: LegendasdivxProvider,
	definition: {
		implementation: 'legendasdivx',
		name: 'Legendasdivx',
		description: 'Portuguese subtitle provider (Portugal) with FPS matching.',
		website: 'https://www.legendasdivx.pt',
		requiresApiKey: false,
		requiresCredentials: true,
		accessType: 'free-account',
		supportedLanguages: LEGENDASDIVX_LANGUAGES,
		supportsHashSearch: false,
		features: ['Portuguese only', 'IMDB search', 'FPS matching', 'Movies & TV'],
		settings: [
			{
				key: 'username',
				label: 'Username',
				type: 'string',
				required: true,
				description: 'Your Legendasdivx username'
			},
			{
				key: 'password',
				label: 'Password',
				type: 'string',
				required: true,
				description: 'Your Legendasdivx password'
			},
			{
				key: 'skipWrongFps',
				label: 'Skip Wrong FPS',
				type: 'boolean',
				required: false,
				description: 'Skip subtitles with mismatched frame rate (default: true)'
			}
		]
	}
};
