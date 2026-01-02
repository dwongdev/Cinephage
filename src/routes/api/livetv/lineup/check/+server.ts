/**
 * GET /api/livetv/lineup/check - Get lineup channel keys for UI state
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getChannelLineupService } from '$lib/server/livetv/lineup';

/**
 * GET /api/livetv/lineup/check
 * Get set of "accountId:channelId" keys for all channels in the lineup.
 * Used by the UI to quickly determine which channels are already in the lineup.
 */
export const GET: RequestHandler = async () => {
	const service = getChannelLineupService();

	try {
		const keys = await service.getLineupChannelKeys();
		return json({ keys: Array.from(keys) });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
