/**
 * GET /api/livetv/playlist.m3u
 *
 * Returns M3U playlist with proxied stream URLs for user's channel lineup.
 * Compatible with VLC, Jellyfin, Plex, and other M3U-compatible players.
 */

import type { RequestHandler } from './$types';
import { getBaseUrlAsync } from '$lib/server/streaming/url';
import { getPlaylistGenerator, M3U_CONTENT_TYPE } from '$lib/server/livetv/proxy';
import { logger } from '$lib/logging';

export const GET: RequestHandler = async ({ request }) => {
	try {
		const baseUrl = await getBaseUrlAsync(request);
		const generator = getPlaylistGenerator();

		const playlist = await generator.generatePlaylist({
			baseUrl,
			includeGroupTitles: true,
			includeChannelNumbers: true,
			includeLogo: true
		});

		logger.debug('[LiveTV] Generated playlist', {
			baseUrl,
			lineCount: playlist.split('\n').length
		});

		return new Response(playlist, {
			status: 200,
			headers: {
				'Content-Type': M3U_CONTENT_TYPE,
				'Content-Disposition': 'attachment; filename="playlist.m3u"',
				'Access-Control-Allow-Origin': '*',
				'Cache-Control': 'no-cache, no-store, must-revalidate'
			}
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger.error('[LiveTV] Failed to generate playlist', { error: message });

		return new Response(`#EXTM3U\n# Error: ${message}`, {
			status: 500,
			headers: {
				'Content-Type': M3U_CONTENT_TYPE,
				'Cache-Control': 'no-cache'
			}
		});
	}
};
