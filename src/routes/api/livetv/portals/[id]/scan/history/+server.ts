/**
 * Portal Scan History API
 *
 * GET /api/livetv/portals/[id]/scan/history - Get scan history
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPortalScannerService } from '$lib/server/livetv/stalker';
import { logger } from '$lib/logging';

/**
 * Get scan history for a portal
 */
export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const limit = parseInt(url.searchParams.get('limit') || '20', 10);

		const scannerService = getPortalScannerService();
		const history = await scannerService.getScanHistory(params.id, limit);

		return json(history);
	} catch (error) {
		logger.error('[API] Failed to get scan history', {
			portalId: params.id,
			error: error instanceof Error ? error.message : String(error)
		});

		return json({ error: 'Failed to get scan history' }, { status: 500 });
	}
};
