/**
 * PUT /api/livetv/scheduler/settings
 * Update Live TV scheduler settings
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLiveTvScheduler } from '$lib/server/livetv/scheduler/LiveTvScheduler';

export const PUT: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const scheduler = getLiveTvScheduler();

	await scheduler.updateSettings(body);
	const settings = await scheduler.getSettings();

	return json({
		success: true,
		settings
	});
};
