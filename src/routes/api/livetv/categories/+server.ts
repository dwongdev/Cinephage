/**
 * GET /api/livetv/categories - Get all categories from all enabled accounts
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStalkerPortalManager } from '$lib/server/livetv/stalker';

/**
 * GET /api/livetv/categories
 * Get all channel categories from all enabled Stalker Portal accounts.
 * Each category includes account information.
 */
export const GET: RequestHandler = async () => {
	const manager = getStalkerPortalManager();

	try {
		const categories = await manager.getAllCategories();
		return json(categories);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
