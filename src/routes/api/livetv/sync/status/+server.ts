/**
 * GET /api/livetv/sync/status
 * Get sync status for all accounts
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getChannelSyncService } from '$lib/server/livetv/sync/ChannelSyncService';

export const GET: RequestHandler = async () => {
	const syncService = getChannelSyncService();
	const status = await syncService.getSyncStatus();

	return json({ success: true, accounts: status });
};
