import { createSSEStream } from '$lib/server/sse';
import { downloadMonitor } from '$lib/server/downloadClients/monitoring';
import { librarySchedulerService } from '$lib/server/library/library-scheduler';
import { diskScanService } from '$lib/server/library/disk-scan';
import { logger } from '$lib/logging';
import { mediaResolver, activityService } from '$lib/server/activity';
import { extractReleaseGroup } from '$lib/server/indexers/parser/patterns/releaseGroup';
import {
	getDashboardStats,
	getRecentlyAdded,
	getMissingEpisodes
} from '$lib/server/dashboard/queries.js';
import type { UnifiedActivity, ActivityStatus } from '$lib/types/activity';
import type { RequestHandler } from '@sveltejs/kit';

interface QueueItem {
	id: string;
	title: string;
	movieId?: string | null;
	seriesId?: string | null;
	episodeIds?: string[] | null;
	seasonNumber?: number | null;
	status: string;
	progress?: number;
	size?: number | null;
	indexerId?: string | null;
	indexerName?: string | null;
	protocol?: string | null;
	quality?: { resolution?: string; source?: string; codec?: string; hdr?: string } | null;
	addedAt: string;
	completedAt?: string | null;
	errorMessage?: string | null;
	isUpgrade?: boolean;
}

function isQueueItem(value: unknown): value is QueueItem {
	if (!value || typeof value !== 'object') return false;
	const maybe = value as Partial<QueueItem>;
	return typeof maybe.id === 'string' && typeof maybe.title === 'string';
}

function getQueueItemFromPayload(payload: unknown): QueueItem | null {
	if (isQueueItem(payload)) return payload;

	if (payload && typeof payload === 'object' && 'queueItem' in payload) {
		const wrapped = (payload as { queueItem?: unknown }).queueItem;
		if (isQueueItem(wrapped)) return wrapped;
	}

	return null;
}

function getQueueErrorFromPayload(payload: unknown): string | undefined {
	if (!payload || typeof payload !== 'object') return undefined;
	const maybeError = (payload as { error?: unknown }).error;
	return typeof maybeError === 'string' ? maybeError : undefined;
}

function mapQueueStatusToActivityStatus(status: string): ActivityStatus {
	switch (status) {
		case 'paused':
			return 'paused';
		case 'failed':
			return 'failed';
		case 'imported':
		case 'seeding-imported':
			return 'imported';
		case 'removed':
			return 'removed';
		default:
			return 'downloading';
	}
}

/**
 * Convert queue item to activity
 */
async function queueItemToActivity(item: QueueItem): Promise<Partial<UnifiedActivity>> {
	const mediaInfo = await mediaResolver.resolveDownloadMediaInfo({
		movieId: item.movieId,
		seriesId: item.seriesId,
		episodeIds: item.episodeIds,
		seasonNumber: item.seasonNumber
	});

	const status = mapQueueStatusToActivityStatus(item.status);

	const releaseGroup = extractReleaseGroup(item.title);

	return {
		id: `queue-${item.id}`,
		mediaType: mediaInfo.mediaType,
		mediaId: mediaInfo.mediaId,
		mediaTitle: mediaInfo.mediaTitle,
		mediaYear: mediaInfo.mediaYear,
		seriesTitle: mediaInfo.seriesTitle,
		seasonNumber: mediaInfo.seasonNumber,
		episodeNumber: mediaInfo.episodeNumber,
		releaseTitle: item.title,
		quality: item.quality ?? null,
		releaseGroup: releaseGroup?.group ?? null,
		size: item.size ?? null,
		indexerId: item.indexerId ?? null,
		indexerName: item.indexerName ?? null,
		protocol: (item.protocol as 'torrent' | 'usenet' | 'streaming') ?? null,
		status,
		statusReason: item.errorMessage ?? undefined,
		downloadProgress: Math.round((item.progress ?? 0) * 100),
		isUpgrade: item.isUpgrade ?? false,
		startedAt: item.addedAt,
		completedAt: item.completedAt ?? null,
		queueItemId: item.id
	};
}

/**
 * Server-Sent Events endpoint for real-time dashboard updates
 *
 * The client receives initial data from the page server load function,
 * so this stream does NOT send an initial state dump. It only sends
 * incremental updates triggered by real events (downloads, scans, etc).
 *
 * Events emitted:
 * - dashboard:stats - Stats update (triggered by library changes)
 * - dashboard:recentlyAdded - Recently added content update
 * - dashboard:missingEpisodes - Missing episodes update
 * - activity:new - New activity
 * - activity:updated - Activity status change
 * - activity:progress - Activity progress update
 */
export const GET: RequestHandler = async () => {
	return createSSEStream((send) => {
		// Send updated dashboard data (stats, recentlyAdded, missingEpisodes)
		const sendDashboardUpdate = async () => {
			try {
				const [stats, recentlyAdded, missingEpisodes] = await Promise.all([
					getDashboardStats(),
					getRecentlyAdded(),
					getMissingEpisodes()
				]);

				send('dashboard:stats', stats);
				send('dashboard:recentlyAdded', recentlyAdded);
				send('dashboard:missingEpisodes', missingEpisodes);
			} catch (error) {
				logger.error('[DashboardStream] Failed to fetch dashboard update', {
					error: error instanceof Error ? error.message : String(error)
				});
			}
		};

		// No initial state sent - client already has data from page server load

		// Send initial activity data when client connects
		(async () => {
			try {
				const { activities } = await activityService.getActivities(
					{ status: 'all', mediaType: 'all', protocol: 'all' },
					{ field: 'time', direction: 'desc' },
					{ limit: 10, offset: 0 }
				);
				for (const activity of activities) {
					send('activity:new', activity);
				}
			} catch (error) {
				logger.error('[DashboardStream] Failed to fetch initial activity', {
					error: error instanceof Error ? error.message : String(error)
				});
			}
		})();

		// Event handlers for download monitor
		const onQueueAdded = async (item: unknown) => {
			try {
				const queueItem = getQueueItemFromPayload(item);
				if (!queueItem) return;
				const activity = await queueItemToActivity(queueItem);
				send('activity:new', activity);
			} catch (error) {
				logger.error('[DashboardStream] Failed to convert queue item to activity', {
					error: error instanceof Error ? error.message : String(error)
				});
			}
		};

		const onQueueUpdated = async (item: unknown) => {
			try {
				const queueItem = getQueueItemFromPayload(item);
				if (!queueItem) return;
				send('activity:progress', {
					id: `queue-${queueItem.id}`,
					progress: Math.round((queueItem.progress ?? 0) * 100),
					status: mapQueueStatusToActivityStatus(queueItem.status)
				});
			} catch (error) {
				logger.error('[DashboardStream] Failed to handle queue update', {
					error: error instanceof Error ? error.message : String(error)
				});
			}
		};

		const onQueueImported = async (data: unknown) => {
			// Send activity update
			try {
				const queueItem = getQueueItemFromPayload(data);
				if (!queueItem) return;
				const activity = await queueItemToActivity(queueItem);
				send('activity:updated', { ...activity, status: 'imported' });
			} catch (error) {
				logger.error('[DashboardStream] Failed to handle imported queue item', {
					error: error instanceof Error ? error.message : String(error)
				});
			}

			// Update dashboard data
			await sendDashboardUpdate();
		};

		const onQueueFailed = async (data: unknown) => {
			try {
				const queueItem = getQueueItemFromPayload(data);
				if (!queueItem) return;
				const activity = await queueItemToActivity(queueItem);
				send('activity:updated', {
					...activity,
					status: 'failed',
					statusReason: getQueueErrorFromPayload(data) ?? activity.statusReason
				});
			} catch (error) {
				logger.error('[DashboardStream] Failed to handle failed queue item', {
					error: error instanceof Error ? error.message : String(error)
				});
			}
		};

		// Library scheduler events
		const onScanComplete = async () => {
			await sendDashboardUpdate();
		};

		// Disk scan events
		const onScanProgress = (progress: unknown) => {
			send('dashboard:scanProgress', progress);
		};

		// Register handlers
		downloadMonitor.on('queue:added', onQueueAdded);
		downloadMonitor.on('queue:updated', onQueueUpdated);
		downloadMonitor.on('queue:imported', onQueueImported);
		downloadMonitor.on('queue:failed', onQueueFailed);
		librarySchedulerService.on('scanComplete', onScanComplete);
		diskScanService.on('progress', onScanProgress);

		// Return cleanup function
		return () => {
			downloadMonitor.off('queue:added', onQueueAdded);
			downloadMonitor.off('queue:updated', onQueueUpdated);
			downloadMonitor.off('queue:imported', onQueueImported);
			downloadMonitor.off('queue:failed', onQueueFailed);
			librarySchedulerService.off('scanComplete', onScanComplete);
			diskScanService.off('progress', onScanProgress);
		};
	});
};
