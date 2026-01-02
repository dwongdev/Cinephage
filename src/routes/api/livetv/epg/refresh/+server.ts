/**
 * POST /api/livetv/epg/refresh
 * Trigger EPG refresh for all enabled accounts
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEpgService } from '$lib/server/livetv/epg/EpgService';

export const POST: RequestHandler = async ({ url }) => {
	const hoursParam = url.searchParams.get('hours');
	const hours = hoursParam ? parseInt(hoursParam, 10) : 6;

	const epgService = getEpgService();

	// First cleanup old programs
	const deleted = await epgService.cleanupOldPrograms();

	// Then fetch new EPG
	const results = await epgService.fetchAllProviderEpg(hours);

	// Convert Map to array for JSON
	const resultsArray = Array.from(results.entries()).map(([accountId, count]) => ({
		accountId,
		programCount: count
	}));

	const totalPrograms = resultsArray.reduce((sum, r) => sum + r.programCount, 0);

	return json({
		success: true,
		summary: {
			accountsProcessed: resultsArray.length,
			totalPrograms,
			oldProgramsDeleted: deleted
		},
		results: resultsArray
	});
};
