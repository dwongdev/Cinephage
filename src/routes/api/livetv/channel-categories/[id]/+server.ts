/**
 * Channel Category API - Single category operations
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getChannelCategoryService } from '$lib/server/livetv/categories';
import { channelCategoryUpdateSchema } from '$lib/validation/schemas';
import { ValidationError, NotFoundError } from '$lib/errors';

/**
 * GET /api/livetv/channel-categories/:id
 * Get a single category
 */
export const GET: RequestHandler = async ({ params }) => {
	const service = getChannelCategoryService();

	try {
		const category = await service.getCategoryById(params.id);

		if (!category) {
			throw new NotFoundError('Category not found');
		}

		return json(category);
	} catch (error) {
		if (error instanceof NotFoundError) {
			return json({ error: error.message }, { status: 404 });
		}
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};

/**
 * PUT /api/livetv/channel-categories/:id
 * Update a category
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	const service = getChannelCategoryService();

	try {
		const existing = await service.getCategoryById(params.id);
		if (!existing) {
			throw new NotFoundError('Category not found');
		}

		const body = await request.json();
		const validated = channelCategoryUpdateSchema.safeParse(body);

		if (!validated.success) {
			throw new ValidationError(validated.error.issues[0]?.message || 'Invalid input');
		}

		await service.updateCategory(params.id, validated.data);

		const updated = await service.getCategoryById(params.id);
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
 * DELETE /api/livetv/channel-categories/:id
 * Delete a category
 */
export const DELETE: RequestHandler = async ({ params }) => {
	const service = getChannelCategoryService();

	try {
		const existing = await service.getCategoryById(params.id);
		if (!existing) {
			throw new NotFoundError('Category not found');
		}

		await service.deleteCategory(params.id);
		return json({ success: true });
	} catch (error) {
		if (error instanceof NotFoundError) {
			return json({ error: error.message }, { status: 404 });
		}
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
