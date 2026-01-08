/**
 * Live TV Portal API - Single Portal Operations
 *
 * GET    /api/livetv/portals/[id] - Get a portal by ID
 * PATCH  /api/livetv/portals/[id] - Update a portal
 * DELETE /api/livetv/portals/[id] - Delete a portal
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStalkerPortalManager } from '$lib/server/livetv/stalker';
import { stalkerPortalUpdateSchema } from '$lib/validation/schemas';
import { logger } from '$lib/logging';

/**
 * Get a portal by ID
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const manager = getStalkerPortalManager();
		const portal = await manager.getPortal(params.id);

		if (!portal) {
			return json({ error: 'Portal not found' }, { status: 404 });
		}

		return json(portal);
	} catch (error) {
		logger.error('[API] Failed to get portal', {
			id: params.id,
			error: error instanceof Error ? error.message : String(error)
		});

		return json({ error: 'Failed to get portal' }, { status: 500 });
	}
};

/**
 * Update a portal
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json();

		// Validate input
		const parsed = stalkerPortalUpdateSchema.safeParse(body);
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
		const portal = await manager.updatePortal(params.id, parsed.data);

		return json(portal);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		logger.error('[API] Failed to update portal', {
			id: params.id,
			error: message
		});

		if (message.includes('not found')) {
			return json({ error: 'Portal not found' }, { status: 404 });
		}

		if (message.includes('already exists')) {
			return json({ error: message }, { status: 409 });
		}

		return json({ error: 'Failed to update portal' }, { status: 500 });
	}
};

/**
 * Delete a portal
 */
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const manager = getStalkerPortalManager();
		await manager.deletePortal(params.id);

		return new Response(null, { status: 204 });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		logger.error('[API] Failed to delete portal', {
			id: params.id,
			error: message
		});

		if (message.includes('not found')) {
			return json({ error: 'Portal not found' }, { status: 404 });
		}

		return json({ error: 'Failed to delete portal' }, { status: 500 });
	}
};
