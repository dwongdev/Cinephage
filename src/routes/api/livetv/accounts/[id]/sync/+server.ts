/**
 * POST /api/livetv/accounts/[id]/sync
 * Trigger channel sync for a specific account
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getChannelSyncService } from '$lib/server/livetv/sync/ChannelSyncService';

export const POST: RequestHandler = async ({ params }) => {
	const { id } = params;

	const syncService = getChannelSyncService();
	const result = await syncService.syncAccount(id);

	if (
		result.errors.length > 0 &&
		result.added === 0 &&
		result.updated === 0 &&
		result.removed === 0
	) {
		return json({ success: false, error: result.errors[0], result }, { status: 400 });
	}

	return json({ success: true, result });
};
