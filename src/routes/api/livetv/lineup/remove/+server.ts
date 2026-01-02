/**
 * POST /api/livetv/lineup/remove - Remove items from the lineup
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getChannelLineupService } from '$lib/server/livetv/lineup';
import { removeFromLineupSchema } from '$lib/validation/schemas';

/**
 * POST /api/livetv/lineup/remove
 * Remove items from the lineup by their IDs.
 */
export const POST: RequestHandler = async ({ request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const result = removeFromLineupSchema.safeParse(data);
	if (!result.success) {
		return json({ error: 'Validation failed', details: result.error.flatten() }, { status: 400 });
	}

	const service = getChannelLineupService();

	try {
		const removed = await service.removeFromLineup(result.data.itemIds);
		return json({ success: true, removed });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
