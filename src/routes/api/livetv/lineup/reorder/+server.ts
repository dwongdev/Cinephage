/**
 * POST /api/livetv/lineup/reorder - Reorder lineup items
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getChannelLineupService } from '$lib/server/livetv/lineup';
import { reorderLineupSchema } from '$lib/validation/schemas';

/**
 * POST /api/livetv/lineup/reorder
 * Reorder lineup items. The itemIds array represents the new order.
 */
export const POST: RequestHandler = async ({ request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const result = reorderLineupSchema.safeParse(data);
	if (!result.success) {
		return json({ error: 'Validation failed', details: result.error.flatten() }, { status: 400 });
	}

	const service = getChannelLineupService();

	try {
		await service.reorderLineup(result.data.itemIds);
		return json({ success: true, updated: result.data.itemIds.length });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
