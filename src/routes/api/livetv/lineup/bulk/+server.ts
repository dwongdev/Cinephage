/**
 * Channel Lineup Bulk Operations API
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getChannelLineupService } from '$lib/server/livetv/lineup/ChannelLineupService';
import { bulkChannelUpdateSchema } from '$lib/validation/schemas';
import { ValidationError } from '$lib/errors';

/**
 * POST /api/livetv/lineup/bulk
 * Bulk update channels (assign category, auto-number)
 */
export const POST: RequestHandler = async ({ request }) => {
	const service = getChannelLineupService();

	try {
		const body = await request.json();
		const validated = bulkChannelUpdateSchema.safeParse(body);

		if (!validated.success) {
			throw new ValidationError(validated.error.issues[0]?.message || 'Invalid input');
		}

		const { itemIds, categoryId, channelNumberStart } = validated.data;
		let updated = 0;

		// Apply category assignment if specified
		if (categoryId !== undefined) {
			updated = await service.bulkAssignCategory(itemIds, categoryId);
		}

		// Apply auto-numbering if specified
		if (channelNumberStart !== undefined) {
			updated = await service.autoNumberChannels(itemIds, channelNumberStart);
		}

		return json({ success: true, updated });
	} catch (error) {
		if (error instanceof ValidationError) {
			return json({ error: error.message }, { status: 400 });
		}
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
