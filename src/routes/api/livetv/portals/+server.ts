/**
 * Live TV Portals API
 *
 * GET  /api/livetv/portals - List all saved portals
 * POST /api/livetv/portals - Create a new portal
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStalkerPortalManager } from '$lib/server/livetv/stalker';
import { stalkerPortalCreateSchema } from '$lib/validation/schemas';
import { logger } from '$lib/logging';

/**
 * List all portals
 */
export const GET: RequestHandler = async () => {
	try {
		const manager = getStalkerPortalManager();
		const portals = await manager.getPortals();

		return json(portals);
	} catch (error) {
		logger.error('[API] Failed to list portals', {
			error: error instanceof Error ? error.message : String(error)
		});

		return json({ error: 'Failed to list portals' }, { status: 500 });
	}
};

/**
 * Create a new portal
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		// Validate input
		const parsed = stalkerPortalCreateSchema.safeParse(body);
		if (!parsed.success) {
			return json(
				{
					error: 'Validation failed',
					details: parsed.error.flatten().fieldErrors
				},
				{ status: 400 }
			);
		}

		const manager = getStalkerPortalManager();

		// Check if detectType is explicitly set to false
		const detectType = body.detectType !== false;

		const portal = await manager.createPortal(parsed.data, detectType);

		return json(portal, { status: 201 });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		logger.error('[API] Failed to create portal', { error: message });

		// Duplicate URL
		if (message.includes('already exists')) {
			return json({ error: message }, { status: 409 });
		}

		// Unique constraint violation
		if (message.includes('UNIQUE constraint failed')) {
			return json({ error: 'A portal with this URL already exists' }, { status: 409 });
		}

		return json({ error: 'Failed to create portal' }, { status: 500 });
	}
};
