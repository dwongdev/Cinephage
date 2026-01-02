/**
 * Channel Categories API - CRUD for user-created categories
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getChannelCategoryService } from '$lib/server/livetv/categories';
import { channelCategoryCreateSchema } from '$lib/validation/schemas';
import { ValidationError } from '$lib/errors';

/**
 * GET /api/livetv/channel-categories
 * Get all user-created categories with channel counts
 */
export const GET: RequestHandler = async () => {
	const service = getChannelCategoryService();

	try {
		const categories = await service.getCategoriesWithCounts();
		return json(categories);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};

/**
 * POST /api/livetv/channel-categories
 * Create a new category
 */
export const POST: RequestHandler = async ({ request }) => {
	const service = getChannelCategoryService();

	try {
		const body = await request.json();
		const validated = channelCategoryCreateSchema.safeParse(body);

		if (!validated.success) {
			throw new ValidationError(validated.error.issues[0]?.message || 'Invalid input');
		}

		const category = await service.createCategory(validated.data);
		return json(category, { status: 201 });
	} catch (error) {
		if (error instanceof ValidationError) {
			return json({ error: error.message }, { status: 400 });
		}
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
