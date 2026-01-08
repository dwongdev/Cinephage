/**
 * Portal Scan Results Approve API
 *
 * POST /api/livetv/portals/[id]/scan/results/approve - Approve scan results
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPortalScannerService } from '$lib/server/livetv/stalker';
import { logger } from '$lib/logging';
import { z } from 'zod';

const approveSchema = z.object({
	resultIds: z.array(z.string()).min(1)
});

/**
 * Approve scan results and create accounts
 */
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();

		// Validate input
		const parsed = approveSchema.safeParse(body);
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
		const accountIds = await scannerService.approveMultiple(parsed.data.resultIds);

		return json({
			approved: accountIds.length,
			accountIds
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		logger.error('[API] Failed to approve scan results', {
			portalId: params.id,
			error: message
		});

		return json({ error: 'Failed to approve scan results' }, { status: 500 });
	}
};
