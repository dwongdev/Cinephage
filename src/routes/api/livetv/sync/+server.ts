/**
 * POST /api/livetv/sync
 * Trigger channel sync for all enabled accounts
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getChannelSyncService } from '$lib/server/livetv/sync/ChannelSyncService';

export const POST: RequestHandler = async () => {
	const syncService = getChannelSyncService();
	const results = await syncService.syncAllAccounts();

	// Convert Map to array for JSON serialization
	const resultsArray = Array.from(results.values());

	const totalAdded = resultsArray.reduce((sum, r) => sum + r.added, 0);
	const totalUpdated = resultsArray.reduce((sum, r) => sum + r.updated, 0);
	const totalRemoved = resultsArray.reduce((sum, r) => sum + r.removed, 0);
	const totalErrors = resultsArray.reduce((sum, r) => sum + r.errors.length, 0);

	return json({
		success: true,
		summary: {
			accountsSynced: resultsArray.length,
			totalAdded,
			totalUpdated,
			totalRemoved,
			totalErrors
		},
		results: resultsArray
	});
};
