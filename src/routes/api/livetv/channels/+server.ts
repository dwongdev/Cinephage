/**
 * GET /api/livetv/channels - Get all channels from all enabled accounts
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStalkerPortalManager } from '$lib/server/livetv/stalker';

/**
 * GET /api/livetv/channels
 * Get all channels from all enabled Stalker Portal accounts.
 * Each channel includes account and category information.
 *
 * Query parameters:
 * - category: Filter by category ID
 * - search: Search by channel name
 */
export const GET: RequestHandler = async ({ url }) => {
	const manager = getStalkerPortalManager();
	const categoryFilter = url.searchParams.get('category');
	const searchFilter = url.searchParams.get('search')?.toLowerCase();

	try {
		let channels = await manager.getAllChannels();

		// Apply category filter
		if (categoryFilter) {
			channels = channels.filter((ch) => ch.categoryId === categoryFilter);
		}

		// Apply search filter
		if (searchFilter) {
			channels = channels.filter((ch) => ch.name.toLowerCase().includes(searchFilter));
		}

		return json(channels);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
