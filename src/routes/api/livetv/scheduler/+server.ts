/**
 * GET /api/livetv/scheduler
 * Get Live TV scheduler status (task run times, intervals, etc.)
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLiveTvScheduler } from '$lib/server/livetv/scheduler/LiveTvScheduler';

export const GET: RequestHandler = async () => {
	const scheduler = getLiveTvScheduler();
	const status = await scheduler.getStatus();
	const settings = await scheduler.getSettings();

	return json({
		success: true,
		status: scheduler.status,
		settings,
		tasks: status.tasks
	});
};
