/**
 * GET /api/livetv/accounts/:id - Get a specific account
 * PUT /api/livetv/accounts/:id - Update an account
 * DELETE /api/livetv/accounts/:id - Delete an account
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStalkerPortalManager } from '$lib/server/livetv/stalker';
import { stalkerAccountUpdateSchema } from '$lib/validation/schemas';

/**
 * GET /api/livetv/accounts/:id
 * Get a specific Stalker Portal account by ID.
 */
export const GET: RequestHandler = async ({ params }) => {
	const manager = getStalkerPortalManager();
	const account = await manager.getAccount(params.id);

	if (!account) {
		return json({ error: 'Account not found' }, { status: 404 });
	}

	return json(account);
};

/**
 * PUT /api/livetv/accounts/:id
 * Update an existing Stalker Portal account.
 */
export const PUT: RequestHandler = async ({ params, request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const result = stalkerAccountUpdateSchema.safeParse(data);

	if (!result.success) {
		return json(
			{
				error: 'Validation failed',
				details: result.error.flatten()
			},
			{ status: 400 }
		);
	}

	const manager = getStalkerPortalManager();
	const updated = await manager.updateAccount(params.id, result.data);

	if (!updated) {
		return json({ error: 'Account not found' }, { status: 404 });
	}

	return json({ success: true, account: updated });
};

/**
 * DELETE /api/livetv/accounts/:id
 * Delete a Stalker Portal account.
 */
export const DELETE: RequestHandler = async ({ params }) => {
	const manager = getStalkerPortalManager();
	const deleted = await manager.deleteAccount(params.id);

	if (!deleted) {
		return json({ error: 'Account not found' }, { status: 404 });
	}

	return json({ success: true });
};
