/**
 * GET /api/livetv/accounts - List all Stalker Portal accounts
 * POST /api/livetv/accounts - Create a new account
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStalkerPortalManager } from '$lib/server/livetv/stalker';
import { stalkerAccountCreateSchema } from '$lib/validation/schemas';

/**
 * GET /api/livetv/accounts
 * List all configured Stalker Portal accounts.
 */
export const GET: RequestHandler = async () => {
	const manager = getStalkerPortalManager();
	const accounts = await manager.getAccounts();
	return json(accounts);
};

/**
 * POST /api/livetv/accounts
 * Create a new Stalker Portal account.
 */
export const POST: RequestHandler = async ({ request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const result = stalkerAccountCreateSchema.safeParse(data);

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

	try {
		const created = await manager.createAccount(result.data);
		return json({ success: true, account: created });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ error: message }, { status: 500 });
	}
};
