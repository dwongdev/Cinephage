/**
 * GET /api/livetv/epg/now
 * Get current programs for all lineup items
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEpgService } from '$lib/server/livetv/epg/EpgService';

export const GET: RequestHandler = async () => {
	const epgService = getEpgService();
	const programs = await epgService.getCurrentPrograms();

	// Convert Map to object for JSON serialization
	const programsObj: Record<string, unknown> = {};
	for (const [lineupItemId, program] of programs) {
		programsObj[lineupItemId] = program;
	}

	return json({
		success: true,
		programs: programsObj,
		count: programs.size
	});
};
