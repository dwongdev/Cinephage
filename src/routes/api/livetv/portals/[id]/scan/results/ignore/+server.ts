/**
 * Portal Scan Results Ignore API
 *
 * POST /api/livetv/portals/[id]/scan/results/ignore - Ignore scan results
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPortalScannerService } from '$lib/server/livetv/stalker';
import { logger } from '$lib/logging';
import { z } from 'zod';

const ignoreSchema = z.object({
	resultIds: z.array(z.string()).min(1)
});

/**
 * Ignore scan results
 */
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();

		// Validate input
		const parsed = ignoreSchema.safeParse(body);
		if (!parsed.success) {
			return json(
				{
					error: 'Validation failed',
					details: parsed.error.flatten().fieldErrors
				},
				{ status: 400 }
			);
		}

		const scannerService = getPortalScannerService();
		await scannerService.ignoreMultiple(parsed.data.resultIds);

		return json({
			ignored: parsed.data.resultIds.length
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		logger.error('[API] Failed to ignore scan results', {
			portalId: params.id,
			error: message
		});

		return json({ error: 'Failed to ignore scan results' }, { status: 500 });
	}
};
