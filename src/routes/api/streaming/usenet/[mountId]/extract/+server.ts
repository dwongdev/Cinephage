/**
 * API endpoint for triggering NZB extraction.
 *
 * POST /api/streaming/usenet/[mountId]/extract
 * - Starts downloading and extracting compressed content
 *
 * DELETE /api/streaming/usenet/[mountId]/extract
 * - Cancels an ongoing extraction
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getNzbStreamService } from '$lib/server/streaming/nzb/NzbStreamService';
import { getNzbMountManager } from '$lib/server/streaming/nzb/NzbMountManager';
import { logger } from '$lib/logging';

/**
 * Start extraction for a mount.
 */
export const POST: RequestHandler = async ({ params }) => {
	const { mountId } = params;

	if (!mountId) {
		throw error(400, 'Mount ID required');
	}

	const mountManager = getNzbMountManager();
	const streamService = getNzbStreamService();

	// Check if mount exists
	const mount = await mountManager.getMount(mountId);
	if (!mount) {
		throw error(404, 'Mount not found');
	}

	// Check if extraction is already in progress
	if (streamService.isExtractionInProgress(mountId)) {
		return json({
			status: 'in_progress',
			message: 'Extraction already in progress'
		});
	}

	// Check if already extracted
	if (mount.status === 'ready') {
		return json({
			status: 'ready',
			message: 'Content is already ready for streaming'
		});
	}

	logger.info('[API] Starting extraction', { mountId });

	// Start extraction in background (don't await)
	streamService.startExtraction(mountId).then((result) => {
		if (result.success) {
			logger.info('[API] Extraction completed', {
				mountId,
				extractedFile: result.extractedFilePath
			});
		} else {
			logger.error('[API] Extraction failed', {
				mountId,
				error: result.error
			});
		}
	});

	return json({
		status: 'started',
		message: 'Extraction started'
	});
};

/**
 * Cancel extraction for a mount.
 */
export const DELETE: RequestHandler = async ({ params }) => {
	const { mountId } = params;

	if (!mountId) {
		throw error(400, 'Mount ID required');
	}

	const streamService = getNzbStreamService();

	const cancelled = streamService.cancelExtraction(mountId);

	if (cancelled) {
		logger.info('[API] Extraction cancelled', { mountId });
		return json({
			status: 'cancelled',
			message: 'Extraction cancelled'
		});
	}

	return json({
		status: 'not_found',
		message: 'No extraction in progress for this mount'
	});
};

/**
 * Get extraction status for a mount.
 */
export const GET: RequestHandler = async ({ params }) => {
	const { mountId } = params;

	if (!mountId) {
		throw error(400, 'Mount ID required');
	}

	const mountManager = getNzbMountManager();
	const streamService = getNzbStreamService();

	const mount = await mountManager.getMount(mountId);
	if (!mount) {
		throw error(404, 'Mount not found');
	}

	const isExtracting = streamService.isExtractionInProgress(mountId);

	return json({
		mountId,
		status: mount.status,
		isExtracting,
		requiresExtraction: mount.status === 'requires_extraction'
	});
};
