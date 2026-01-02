/**
 * GET /api/livetv/lineup - Get the custom channel lineup
 * POST /api/livetv/lineup - Add channels to the lineup
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getChannelLineupService } from '$lib/server/livetv/lineup';
import { addToLineupSchema } from '$lib/validation/schemas';

/**
 * GET /api/livetv/lineup
 * Get all lineup items ordered by position.
 */
export const GET: RequestHandler = async () => {
	const service = getChannelLineupService();

	try {
		const lineup = await service.getLineup();
		return json(lineup);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};

/**
 * POST /api/livetv/lineup
 * Add channels to the lineup.
 */
export const POST: RequestHandler = async ({ request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const result = addToLineupSchema.safeParse(data);
	if (!result.success) {
		return json({ error: 'Validation failed', details: result.error.flatten() }, { status: 400 });
	}

	const service = getChannelLineupService();

	try {
		const { added, skipped } = await service.addToLineup(result.data);
		return json({ success: true, added, skipped });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
