/**
 * GET/PUT/DELETE /api/livetv/epg/sources/[id]
 * Get, update, or delete an XMLTV source
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEpgService } from '$lib/server/livetv/epg/EpgService';

export const GET: RequestHandler = async ({ params }) => {
	const { id } = params;

	const epgService = getEpgService();
	const source = await epgService.getXmltvSource(id);

	if (!source) {
		return json({ success: false, error: 'Source not found' }, { status: 404 });
	}

	return json({ success: true, source });
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const { id } = params;
	const body = await request.json();

	const epgService = getEpgService();
	const source = await epgService.updateXmltvSource(id, body);

	if (!source) {
		return json({ success: false, error: 'Source not found' }, { status: 404 });
	}

	return json({ success: true, source });
};

export const DELETE: RequestHandler = async ({ params }) => {
	const { id } = params;

	const epgService = getEpgService();
	const deleted = await epgService.deleteXmltvSource(id);

	if (!deleted) {
		return json({ success: false, error: 'Source not found' }, { status: 404 });
	}

	return json({ success: true });
};
