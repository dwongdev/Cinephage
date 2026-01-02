/**
 * Channel Lineup Item API - Single channel operations
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getChannelLineupService } from '$lib/server/livetv/lineup/ChannelLineupService';
import { channelUpdateSchema } from '$lib/validation/schemas';
import { ValidationError, NotFoundError } from '$lib/errors';

/**
 * GET /api/livetv/lineup/:id
 * Get a single lineup item
 */
export const GET: RequestHandler = async ({ params }) => {
	const service = getChannelLineupService();

	try {
		const item = await service.getChannelById(params.id);

		if (!item) {
			throw new NotFoundError('Channel not found in lineup');
		}

		return json(item);
	} catch (error) {
		if (error instanceof NotFoundError) {
			return json({ error: error.message }, { status: 404 });
		}
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};

/**
 * PUT /api/livetv/lineup/:id
 * Update a channel's customization
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	const service = getChannelLineupService();

	try {
		const existing = await service.getChannelById(params.id);
		if (!existing) {
			throw new NotFoundError('Channel not found in lineup');
		}

		const body = await request.json();
		const validated = channelUpdateSchema.safeParse(body);

		if (!validated.success) {
			throw new ValidationError(validated.error.issues[0]?.message || 'Invalid input');
		}

		await service.updateChannel(params.id, validated.data);

		const updated = await service.getChannelById(params.id);
		return json(updated);
	} catch (error) {
		if (error instanceof NotFoundError) {
			return json({ error: error.message }, { status: 404 });
		}
		if (error instanceof ValidationError) {
			return json({ error: error.message }, { status: 400 });
		}
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};

/**
 * DELETE /api/livetv/lineup/:id
 * Remove a channel from lineup
 */
export const DELETE: RequestHandler = async ({ params }) => {
	const service = getChannelLineupService();

	try {
		const existing = await service.getChannelById(params.id);
		if (!existing) {
			throw new NotFoundError('Channel not found in lineup');
		}

		await service.removeFromLineup([params.id]);
		return json({ success: true });
	} catch (error) {
		if (error instanceof NotFoundError) {
			return json({ error: error.message }, { status: 404 });
		}
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
