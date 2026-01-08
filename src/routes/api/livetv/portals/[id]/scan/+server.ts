/**
 * Portal Scan API
 *
 * POST /api/livetv/portals/[id]/scan - Start a new scan
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPortalScannerService } from '$lib/server/livetv/stalker';
import { logger } from '$lib/logging';
import { z } from 'zod';

const randomScanSchema = z.object({
	type: z.literal('random'),
	macPrefix: z.string().optional(),
	macCount: z.number().min(1).max(100000).default(100),
	rateLimit: z.number().min(100).max(10000).default(500)
});

const sequentialScanSchema = z.object({
	type: z.literal('sequential'),
	macRangeStart: z.string(),
	macRangeEnd: z.string(),
	rateLimit: z.number().min(100).max(10000).default(500)
});

const importScanSchema = z.object({
	type: z.literal('import'),
	macs: z.array(z.string()).min(1),
	rateLimit: z.number().min(100).max(10000).default(500)
});

const scanRequestSchema = z.discriminatedUnion('type', [
	randomScanSchema,
	sequentialScanSchema,
	importScanSchema
]);

/**
 * Start a new scan
 */
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();

		// Validate input
		const parsed = scanRequestSchema.safeParse(body);
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
		let worker;

		switch (parsed.data.type) {
			case 'random':
				worker = await scannerService.startRandomScan(params.id, {
					macPrefix: parsed.data.macPrefix,
					macCount: parsed.data.macCount,
					rateLimit: parsed.data.rateLimit
				});
				break;

			case 'sequential':
				worker = await scannerService.startSequentialScan(params.id, {
					macRangeStart: parsed.data.macRangeStart,
					macRangeEnd: parsed.data.macRangeEnd,
					rateLimit: parsed.data.rateLimit
				});
				break;

			case 'import':
				worker = await scannerService.startImportScan(params.id, {
					macs: parsed.data.macs,
					rateLimit: parsed.data.rateLimit
				});
				break;
		}

		return json(
			{
				workerId: worker.id,
				status: 'started',
				metadata: worker.metadata
			},
			{ status: 202 }
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		logger.error('[API] Failed to start portal scan', {
			portalId: params.id,
			error: message
		});

		if (message.includes('not found')) {
			return json({ error: 'Portal not found' }, { status: 404 });
		}

		if (message.includes('too large') || message.includes('Maximum')) {
			return json({ error: message }, { status: 400 });
		}

		if (message.includes('concurrency') || message.includes('Concurrency')) {
			return json(
				{ error: 'Too many scans running. Please wait for an existing scan to complete.' },
				{ status: 429 }
			);
		}

		return json({ error: 'Failed to start scan' }, { status: 500 });
	}
};
