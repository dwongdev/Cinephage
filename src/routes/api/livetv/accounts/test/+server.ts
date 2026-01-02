/**
 * POST /api/livetv/accounts/test - Test account configuration before saving
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStalkerPortalManager } from '$lib/server/livetv/stalker';
import { stalkerAccountTestSchema } from '$lib/validation/schemas';

/**
 * POST /api/livetv/accounts/test
 * Test Stalker Portal connection with provided credentials.
 * Use this to validate credentials before creating/updating an account.
 */
export const POST: RequestHandler = async ({ request }) => {
	let data: unknown;
	try {
		data = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const result = stalkerAccountTestSchema.safeParse(data);

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
		const testResult = await manager.testAccountConfig(result.data);
		return json(testResult);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ success: false, error: message });
	}
};
