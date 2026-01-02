/**
 * GET /api/livetv/epg/channel/[id]
 * Get EPG for a specific lineup item
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEpgService } from '$lib/server/livetv/epg/EpgService';

export const GET: RequestHandler = async ({ params, url }) => {
	const { id } = params;

	// Parse optional time range from query params
	const startParam = url.searchParams.get('start');
	const endParam = url.searchParams.get('end');

	const start = startParam ? new Date(startParam) : undefined;
	const end = endParam ? new Date(endParam) : undefined;

	const epgService = getEpgService();

	const [programs, current, next] = await Promise.all([
		epgService.getEpgForChannel(id, start, end),
		epgService.getCurrentProgram(id),
		epgService.getNextProgram(id)
	]);

	return json({
		success: true,
		current,
		next,
		programs
	});
};
