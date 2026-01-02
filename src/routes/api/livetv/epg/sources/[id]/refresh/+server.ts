/**
 * POST /api/livetv/epg/sources/[id]/refresh
 * Trigger EPG refresh for a specific XMLTV source
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEpgService } from '$lib/server/livetv/epg/EpgService';

export const POST: RequestHandler = async ({ params }) => {
	const { id } = params;

	const epgService = getEpgService();

	try {
		const programCount = await epgService.fetchXmltvSource(id);
		const source = await epgService.getXmltvSource(id);

		return json({
			success: true,
			programCount,
			source
		});
	} catch (error) {
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 400 }
		);
	}
};
