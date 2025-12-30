/**
 * StreamabilityChecker - Determines if NZB content can be streamed directly.
 *
 * Probes RAR headers to detect compression/encryption without downloading
 * the full archive. Caches assembled RAR info for subsequent stream creation.
 */

import { logger } from '$lib/logging';
import { getNntpClientManager } from './nntp/NntpClientManager';
import { type ParsedNzb } from './NzbParser';
import { getNzbMountManager, type MountInfo, type StreamabilityInfo } from './NzbMountManager';
import { assembleMultiPartRar, findLargestMediaFile } from './rar/MultiPartAssembler';
import { getStreamingError } from './rar/RarHeaderParser';
import type { AssembledRar } from './rar/types';

/**
 * Cached assembled RAR for active streams.
 */
interface CachedRar {
	assembled: AssembledRar;
	timestamp: number;
}

/**
 * RAR cache TTL (1 hour).
 */
const RAR_CACHE_TTL = 60 * 60 * 1000;

/**
 * Callback type for getting parsed NZB from the main service.
 */
export type GetParsedNzbFn = (mount: MountInfo) => Promise<ParsedNzb>;

/**
 * StreamabilityChecker handles detection of whether content can be streamed.
 */
class StreamabilityChecker {
	private rarCache: Map<string, CachedRar> = new Map();
	private cleanupInterval: ReturnType<typeof setInterval> | null = null;

	constructor() {
		// Periodic cache cleanup
		this.cleanupInterval = setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
	}

	/**
	 * Check if a mount's content can be streamed directly or requires extraction.
	 * This fetches RAR headers to detect compression without starting a full stream.
	 */
	async checkStreamability(
		mountId: string,
		getParsedNzb: GetParsedNzbFn
	): Promise<StreamabilityInfo> {
		const mountManager = getNzbMountManager();
		const clientManager = getNntpClientManager();

		const mount = await mountManager.getMount(mountId);
		if (!mount) {
			return {
				canStream: false,
				requiresExtraction: false,
				error: 'Mount not found'
			};
		}

		// Get parsed NZB
		const parsed = await getParsedNzb(mount);

		// Check if NZB has only non-RAR files (direct streaming)
		const hasOnlyNonRar = parsed.files.every((f) => !f.isRar);
		if (hasOnlyNonRar) {
			logger.info('[StreamabilityChecker] Mount has no RAR files, can stream directly', {
				mountId,
				files: parsed.files.length
			});
			return {
				canStream: true,
				requiresExtraction: false,
				archiveType: 'none'
			};
		}

		// Has RAR files - need to check if they're compressed
		const hasOnlyRar = parsed.files.every((f) => f.isRar);
		if (!hasOnlyRar) {
			// Mixed content - for now treat as streamable (non-RAR files)
			return {
				canStream: true,
				requiresExtraction: false,
				archiveType: 'none'
			};
		}

		try {
			// Assemble RAR to check compression
			const assembled = await assembleMultiPartRar(parsed.files, clientManager);

			// Cache the assembled RAR for later use
			this.rarCache.set(mountId, { assembled, timestamp: Date.now() });

			// Check streamability
			if (assembled.isStreamable) {
				const innerFile = findLargestMediaFile(assembled);

				if (innerFile?.isEncrypted) {
					logger.info('[StreamabilityChecker] RAR requires password', { mountId });
					return {
						canStream: false,
						requiresExtraction: false,
						requiresPassword: true,
						archiveType: 'rar',
						error: 'Password required'
					};
				}

				logger.info('[StreamabilityChecker] RAR is streamable (stored compression)', {
					mountId,
					volumes: assembled.volumes.length
				});
				return {
					canStream: true,
					requiresExtraction: false,
					archiveType: 'rar',
					compressionMethod: 0
				};
			}

			// Not streamable - needs extraction
			const streamError = getStreamingError(assembled.volumes[0]?.archive);
			const firstFile = assembled.volumes[0]?.archive?.files[0];

			logger.info('[StreamabilityChecker] RAR requires extraction', {
				mountId,
				reason: streamError,
				compressionMethod: firstFile?.method
			});

			return {
				canStream: false,
				requiresExtraction: true,
				archiveType: 'rar',
				compressionMethod: firstFile?.method,
				error: streamError || 'RAR is compressed'
			};
		} catch (error) {
			logger.error('[StreamabilityChecker] Failed to check streamability', {
				mountId,
				error: error instanceof Error ? error.message : 'Unknown error'
			});

			return {
				canStream: false,
				requiresExtraction: false,
				error: error instanceof Error ? error.message : 'Failed to parse archive'
			};
		}
	}

	/**
	 * Get cached assembled RAR for a mount.
	 */
	getCachedRar(mountId: string): AssembledRar | null {
		const cached = this.rarCache.get(mountId);
		if (cached && Date.now() - cached.timestamp < RAR_CACHE_TTL) {
			return cached.assembled;
		}
		return null;
	}

	/**
	 * Cache an assembled RAR.
	 */
	cacheRar(mountId: string, assembled: AssembledRar): void {
		this.rarCache.set(mountId, { assembled, timestamp: Date.now() });
	}

	/**
	 * Remove a cached RAR entry.
	 */
	removeCachedRar(mountId: string): void {
		this.rarCache.delete(mountId);
	}

	/**
	 * Cleanup old cache entries.
	 */
	private cleanupCache(): void {
		const now = Date.now();
		let cleaned = 0;

		for (const [mountId, cached] of this.rarCache) {
			if (now - cached.timestamp > RAR_CACHE_TTL) {
				this.rarCache.delete(mountId);
				cleaned++;
			}
		}

		if (cleaned > 0) {
			logger.debug('[StreamabilityChecker] Cleaned RAR cache', { cleaned });
		}
	}

	/**
	 * Shutdown and clear caches.
	 */
	shutdown(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		this.rarCache.clear();
	}
}

// Singleton instance
let instance: StreamabilityChecker | null = null;

/**
 * Get the singleton StreamabilityChecker.
 */
export function getStreamabilityChecker(): StreamabilityChecker {
	if (!instance) {
		instance = new StreamabilityChecker();
	}
	return instance;
}
