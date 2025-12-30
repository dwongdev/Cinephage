/**
 * API endpoint for extraction cache management.
 *
 * GET /api/streaming/usenet/cache
 * - Returns cache statistics
 *
 * POST /api/streaming/usenet/cache/cleanup
 * - Triggers manual cleanup
 *
 * DELETE /api/streaming/usenet/cache/[mountId]
 * - Cleans up a specific mount's extracted files
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getExtractionCacheManager } from '$lib/server/streaming/nzb/extraction/ExtractionCacheManager';

/**
 * Get cache statistics.
 */
export const GET: RequestHandler = async () => {
	const cacheManager = getExtractionCacheManager();
	const stats = await cacheManager.getStats();

	return json({
		fileCount: stats.fileCount,
		totalSizeMB: Math.round(stats.totalSizeBytes / 1024 / 1024),
		expiredCount: stats.expiredCount
	});
};

/**
 * Trigger manual cleanup.
 */
export const POST: RequestHandler = async () => {
	const cacheManager = getExtractionCacheManager();
	const result = await cacheManager.runCleanup();

	return json({
		cleaned: result.cleaned,
		freedMB: Math.round(result.freedBytes / 1024 / 1024)
	});
};
