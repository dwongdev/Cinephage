/**
 * GET /api/livetv/accounts/:id/channels - Get channels from a specific account
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStalkerPortalManager } from '$lib/server/livetv/stalker';

/**
 * GET /api/livetv/accounts/:id/channels
 * Get all channels from a specific Stalker Portal account.
 */
export const GET: RequestHandler = async ({ params }) => {
	const manager = getStalkerPortalManager();

	try {
		const channels = await manager.getAccountChannels(params.id);
		return json(channels);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';

		if (message === 'Account not found') {
			return json({ error: message }, { status: 404 });
		}

		return json({ error: message }, { status: 500 });
	}
};
