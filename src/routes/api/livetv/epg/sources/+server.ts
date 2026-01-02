/**
 * GET/POST /api/livetv/epg/sources
 * List or add XMLTV sources
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEpgService } from '$lib/server/livetv/epg/EpgService';

export const GET: RequestHandler = async () => {
	const epgService = getEpgService();
	const sources = await epgService.getXmltvSources();

	return json({ success: true, sources });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { name, url } = body;

	if (!name || !url) {
		return json({ success: false, error: 'Name and URL are required' }, { status: 400 });
	}

	const epgService = getEpgService();
	const source = await epgService.addXmltvSource(name, url);

	return json({ success: true, source }, { status: 201 });
};
