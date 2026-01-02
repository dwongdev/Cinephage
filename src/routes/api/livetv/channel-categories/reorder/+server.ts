/**
 * Channel Categories Reorder API
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getChannelCategoryService } from '$lib/server/livetv/categories';
import { reorderCategoriesSchema } from '$lib/validation/schemas';
import { ValidationError } from '$lib/errors';

/**
 * POST /api/livetv/channel-categories/reorder
 * Reorder categories
 */
export const POST: RequestHandler = async ({ request }) => {
	const service = getChannelCategoryService();

	try {
		const body = await request.json();
		const validated = reorderCategoriesSchema.safeParse(body);

		if (!validated.success) {
			throw new ValidationError(validated.error.issues[0]?.message || 'Invalid input');
		}

		await service.reorderCategories(validated.data.categoryIds);
		return json({ success: true });
	} catch (error) {
		if (error instanceof ValidationError) {
			return json({ error: error.message }, { status: 400 });
		}
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
