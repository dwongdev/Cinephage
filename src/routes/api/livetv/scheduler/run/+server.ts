/**
 * POST /api/livetv/scheduler/run
 * Manually trigger a scheduler task
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLiveTvScheduler } from '$lib/server/livetv/scheduler/LiveTvScheduler';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { task } = body;

	if (!task) {
		return json({ success: false, error: 'Task name is required' }, { status: 400 });
	}

	const scheduler = getLiveTvScheduler();
	let result;

	try {
		switch (task) {
			case 'channelSync':
				result = await scheduler.runChannelSync();
				break;
			case 'providerEpg':
				result = await scheduler.runProviderEpg();
				break;
			case 'xmltvRefresh':
				result = await scheduler.runXmltvRefresh();
				break;
			case 'epgCleanup':
				result = await scheduler.runEpgCleanup();
				break;
			default:
				return json({ success: false, error: `Unknown task: ${task}` }, { status: 400 });
		}

		return json({
			success: true,
			result
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Task execution failed'
			},
			{ status: 500 }
		);
	}
};
