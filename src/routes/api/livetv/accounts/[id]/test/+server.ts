/**
 * POST /api/livetv/accounts/:id/test - Test a saved account
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStalkerPortalManager } from '$lib/server/livetv/stalker';

/**
 * POST /api/livetv/accounts/:id/test
 * Test connection to a saved Stalker Portal account.
 * Updates the account's test status in the database.
 */
export const POST: RequestHandler = async ({ params }) => {
	const manager = getStalkerPortalManager();

	try {
		const testResult = await manager.testAccount(params.id);
		return json(testResult);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ success: false, error: message });
	}
};
