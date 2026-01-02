/**
 * GET /api/livetv/stream/:accountId/:channelId
 *
 * Proxy IPTV stream through FFmpeg with codec passthrough.
 * Validates channel is in user's lineup before streaming.
 */

import type { RequestHandler } from './$types';
import { getStalkerPortalManager } from '$lib/server/livetv/stalker';
import { getChannelLineupService } from '$lib/server/livetv/lineup';
import { getFFmpegStreamService, MPEGTS_CONTENT_TYPE } from '$lib/server/livetv/proxy';
import { logger } from '$lib/logging';

export const GET: RequestHandler = async ({ params, request, getClientAddress }) => {
	const { accountId, channelId } = params;
	const clientIp = request.headers.get('x-forwarded-for') || getClientAddress();

	logger.info('[LiveTV] Stream requested', { accountId, channelId, clientIp });

	// 1. Validate channel is in user's lineup
	const lineupService = getChannelLineupService();
	const lineup = await lineupService.getLineup();
	const lineupItem = lineup.find(
		(item) => item.accountId === accountId && item.channelId === channelId
	);

	if (!lineupItem) {
		logger.warn('[LiveTV] Channel not in lineup', { accountId, channelId });
		return new Response(JSON.stringify({ error: 'Channel not in lineup' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// 2. Get account and verify it's enabled
	const manager = getStalkerPortalManager();
	const account = await manager.getAccountRecord(accountId);

	if (!account) {
		logger.warn('[LiveTV] Account not found', { accountId });
		return new Response(JSON.stringify({ error: 'Account not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!account.enabled) {
		logger.warn('[LiveTV] Account disabled', { accountId });
		return new Response(JSON.stringify({ error: 'Account is disabled' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// 3. Fetch channels to get cmd
	let channelCmd: string | null = null;
	try {
		const channels = await manager.getAccountChannels(accountId);
		const channel = channels.find((ch) => ch.id === channelId);
		if (channel) {
			channelCmd = channel.cmd;
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger.error('[LiveTV] Failed to fetch channels', { accountId, error: message });
		return new Response(JSON.stringify({ error: 'Failed to fetch channel info from portal' }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	if (!channelCmd) {
		logger.warn('[LiveTV] Channel not found on portal', { accountId, channelId });
		return new Response(JSON.stringify({ error: 'Channel not found on portal' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// 4. Get stream URL and headers from portal
	let streamUrl: string;
	let streamHeaders: Record<string, string>;
	try {
		[streamUrl, streamHeaders] = await Promise.all([
			manager.getStreamUrl(accountId, channelCmd),
			manager.getStreamHeaders(accountId)
		]);
		logger.info('[LiveTV] Resolved stream URL', {
			accountId,
			channelId,
			streamUrl
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger.error('[LiveTV] Failed to get stream URL', { accountId, channelId, error: message });
		return new Response(JSON.stringify({ error: 'Failed to get stream URL from portal' }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	// 5. Spawn FFmpeg and stream response
	const ffmpegService = getFFmpegStreamService();
	const streamKey = `${accountId}:${channelId}:${Date.now()}`;

	try {
		const ffmpeg = ffmpegService.spawnStream({ streamUrl, headers: streamHeaders });

		// Register active stream
		ffmpegService.registerStream({
			key: streamKey,
			accountId,
			channelId,
			channelName: lineupItem.cachedName || 'Unknown',
			clientIp,
			startedAt: new Date(),
			process: ffmpeg
		});

		// Create readable stream from FFmpeg stdout
		const stream = new ReadableStream({
			start(controller) {
				ffmpeg.stdout!.on('data', (chunk: Buffer) => {
					try {
						controller.enqueue(chunk);
					} catch {
						// Controller closed, ignore
					}
				});

				ffmpeg.stdout!.on('end', () => {
					try {
						controller.close();
					} catch {
						// Already closed
					}
					ffmpegService.unregisterStream(streamKey);
				});

				ffmpeg.stdout!.on('error', (error: Error) => {
					logger.error('[LiveTV] Stream read error', { streamKey, error: error.message });
					try {
						controller.error(error);
					} catch {
						// Already closed
					}
					ffmpegService.unregisterStream(streamKey);
				});

				ffmpeg.on('close', (code: number | null) => {
					logger.info('[LiveTV] FFmpeg closed', { streamKey, exitCode: code });
					if (code !== 0 && code !== null) {
						try {
							controller.error(new Error(`FFmpeg exited with code ${code}`));
						} catch {
							// Already closed
						}
					}
					ffmpegService.unregisterStream(streamKey);
				});

				ffmpeg.on('error', (error: Error) => {
					logger.error('[LiveTV] FFmpeg process error', { streamKey, error: error.message });
					try {
						controller.error(error);
					} catch {
						// Already closed
					}
					ffmpegService.unregisterStream(streamKey);
				});
			},
			cancel() {
				// Client disconnected - kill FFmpeg
				logger.info('[LiveTV] Client disconnected', { streamKey });
				ffmpegService.killStream(streamKey);
			}
		});

		return new Response(stream, {
			status: 200,
			headers: {
				'Content-Type': MPEGTS_CONTENT_TYPE,
				'Transfer-Encoding': 'chunked',
				'Access-Control-Allow-Origin': '*',
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Connection: 'keep-alive'
			}
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		logger.error('[LiveTV] Failed to start stream', { accountId, channelId, error: message });
		return new Response(JSON.stringify({ error: 'Failed to start stream' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
