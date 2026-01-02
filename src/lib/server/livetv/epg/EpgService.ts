/**
 * EpgService - Manages EPG (Electronic Program Guide) data.
 * Fetches EPG from providers and external XMLTV sources, stores in database.
 */

import { db } from '$lib/server/db';
import {
	epgPrograms,
	epgSources,
	channelLineupItems,
	stalkerPortalAccounts,
	type EpgProgramRecord,
	type EpgSourceRecord
} from '$lib/server/db/schema';
import { eq, and, gte, lte, sql, asc } from 'drizzle-orm';
import { logger } from '$lib/logging';
import { randomUUID } from 'crypto';
import { getStalkerPortalManager } from '../stalker/StalkerPortalManager';
import { StalkerPortalClient } from '../stalker/StalkerPortalClient';
import { getXmltvParser } from './XmltvParser';

export interface EpgProgram {
	id: string;
	channelXmltvId: string;
	accountId: string | null;
	epgSourceId: string | null;
	startTime: string;
	endTime: string;
	title: string;
	description: string | null;
	category: string | null;
	icon: string | null;
}

export interface CurrentProgram extends EpgProgram {
	progress: number; // 0-100 percentage
	remainingMinutes: number;
}

export interface ChannelEpg {
	channelId: string; // Lineup item ID
	channelName: string;
	current: CurrentProgram | null;
	next: EpgProgram | null;
	programs: EpgProgram[];
}

function toEpgProgram(record: EpgProgramRecord): EpgProgram {
	return {
		id: record.id,
		channelXmltvId: record.channelXmltvId,
		accountId: record.accountId,
		epgSourceId: record.epgSourceId,
		startTime: record.startTime,
		endTime: record.endTime,
		title: record.title,
		description: record.description,
		category: record.category,
		icon: record.icon
	};
}

class EpgService {
	private manager = getStalkerPortalManager();

	/**
	 * Fetch and store EPG from a provider account.
	 * @param accountId Account ID to fetch EPG from
	 * @param hours Number of hours of EPG to fetch (default: 6)
	 */
	async fetchProviderEpg(accountId: string, hours: number = 6): Promise<number> {
		const account = await this.manager.getAccountRecord(accountId);
		if (!account) {
			throw new Error('Account not found');
		}

		if (account.epgEnabled === false) {
			logger.info('[EpgService] EPG disabled for account', { accountId });
			return 0;
		}

		const client = new StalkerPortalClient({
			portalUrl: account.portalUrl,
			macAddress: account.macAddress
		});

		const epgData = await client.getEpgInfo(hours);
		const now = new Date().toISOString();
		let programCount = 0;

		// Get lineup items for this account to map channel IDs
		const lineupItems = await db
			.select({
				channelId: channelLineupItems.channelId,
				cachedXmltvId: channelLineupItems.cachedXmltvId
			})
			.from(channelLineupItems)
			.where(eq(channelLineupItems.accountId, accountId));

		// Build a set of channel IDs we care about
		const lineupChannelIds = new Set(lineupItems.map((item) => item.channelId));

		// Delete existing EPG for this account (will be replaced)
		await db.delete(epgPrograms).where(eq(epgPrograms.accountId, accountId));

		// Insert new EPG data
		for (const [channelId, programs] of epgData.programs) {
			// Only store EPG for channels in our lineup
			if (!lineupChannelIds.has(channelId)) continue;

			for (const prog of programs) {
				// Convert provider timestamps to ISO format
				const startTime = this.timestampToIso(prog.startTimestamp, prog.startTime);
				const endTime = this.timestampToIso(prog.endTimestamp, prog.endTime);

				if (!startTime || !endTime) continue;

				await db.insert(epgPrograms).values({
					id: randomUUID(),
					channelXmltvId: channelId, // Use provider channel ID
					accountId: accountId,
					epgSourceId: null, // Provider EPG, not external
					startTime,
					endTime,
					title: prog.title,
					description: prog.description || null,
					category: prog.category || null,
					icon: null,
					createdAt: now
				});
				programCount++;
			}
		}

		logger.info('[EpgService] Fetched provider EPG', {
			accountId,
			accountName: account.name,
			programs: programCount,
			channels: epgData.programs.size
		});

		return programCount;
	}

	/**
	 * Fetch EPG from all enabled accounts with EPG enabled.
	 */
	async fetchAllProviderEpg(hours: number = 6): Promise<Map<string, number>> {
		const results = new Map<string, number>();
		const accounts = await db
			.select()
			.from(stalkerPortalAccounts)
			.where(
				and(eq(stalkerPortalAccounts.enabled, true), eq(stalkerPortalAccounts.epgEnabled, true))
			);

		for (const account of accounts) {
			try {
				const count = await this.fetchProviderEpg(account.id, hours);
				results.set(account.id, count);
			} catch (error) {
				logger.error('[EpgService] Failed to fetch EPG for account', {
					accountId: account.id,
					error: error instanceof Error ? error.message : 'Unknown error'
				});
				results.set(account.id, 0);
			}
		}

		return results;
	}

	/**
	 * Get EPG for a lineup item.
	 */
	async getEpgForChannel(lineupItemId: string, start?: Date, end?: Date): Promise<EpgProgram[]> {
		// Get the lineup item to find the channel ID and account
		const items = await db
			.select()
			.from(channelLineupItems)
			.where(eq(channelLineupItems.id, lineupItemId))
			.limit(1);

		if (items.length === 0) return [];

		const item = items[0];
		const channelId = item.channelId;
		const accountId = item.accountId;

		// Build query conditions
		const conditions = [
			eq(epgPrograms.channelXmltvId, channelId),
			eq(epgPrograms.accountId, accountId)
		];

		if (start) {
			conditions.push(gte(epgPrograms.endTime, start.toISOString()));
		}
		if (end) {
			conditions.push(lte(epgPrograms.startTime, end.toISOString()));
		}

		const programs = await db
			.select()
			.from(epgPrograms)
			.where(and(...conditions))
			.orderBy(epgPrograms.startTime);

		return programs.map(toEpgProgram);
	}

	/**
	 * Get current program for a lineup item.
	 */
	async getCurrentProgram(lineupItemId: string): Promise<CurrentProgram | null> {
		const now = new Date();
		const nowIso = now.toISOString();

		// Get the lineup item
		const items = await db
			.select()
			.from(channelLineupItems)
			.where(eq(channelLineupItems.id, lineupItemId))
			.limit(1);

		if (items.length === 0) return null;

		const item = items[0];

		// Find program that's currently airing
		const programs = await db
			.select()
			.from(epgPrograms)
			.where(
				and(
					eq(epgPrograms.channelXmltvId, item.channelId),
					eq(epgPrograms.accountId, item.accountId),
					lte(epgPrograms.startTime, nowIso),
					gte(epgPrograms.endTime, nowIso)
				)
			)
			.limit(1);

		if (programs.length === 0) return null;

		const prog = programs[0];
		const startMs = new Date(prog.startTime).getTime();
		const endMs = new Date(prog.endTime).getTime();
		const nowMs = now.getTime();

		const duration = endMs - startMs;
		const elapsed = nowMs - startMs;
		const progress = Math.min(100, Math.max(0, (elapsed / duration) * 100));
		const remainingMinutes = Math.max(0, Math.round((endMs - nowMs) / 60000));

		return {
			...toEpgProgram(prog),
			progress,
			remainingMinutes
		};
	}

	/**
	 * Get current programs for all lineup items.
	 */
	async getCurrentPrograms(): Promise<Map<string, CurrentProgram>> {
		const results = new Map<string, CurrentProgram>();
		const now = new Date();
		const nowIso = now.toISOString();

		// Get all lineup items with their channel IDs
		const lineupItems = await db
			.select({
				id: channelLineupItems.id,
				channelId: channelLineupItems.channelId,
				accountId: channelLineupItems.accountId
			})
			.from(channelLineupItems);

		if (lineupItems.length === 0) return results;

		// Get all current programs
		const programs = await db
			.select()
			.from(epgPrograms)
			.where(and(lte(epgPrograms.startTime, nowIso), gte(epgPrograms.endTime, nowIso)));

		// Build a lookup map: accountId:channelId -> program
		const programLookup = new Map<string, EpgProgramRecord>();
		for (const prog of programs) {
			if (prog.accountId) {
				programLookup.set(`${prog.accountId}:${prog.channelXmltvId}`, prog);
			}
		}

		// Match lineup items to programs
		for (const item of lineupItems) {
			const prog = programLookup.get(`${item.accountId}:${item.channelId}`);
			if (!prog) continue;

			const startMs = new Date(prog.startTime).getTime();
			const endMs = new Date(prog.endTime).getTime();
			const nowMs = now.getTime();

			const duration = endMs - startMs;
			const elapsed = nowMs - startMs;
			const progress = Math.min(100, Math.max(0, (elapsed / duration) * 100));
			const remainingMinutes = Math.max(0, Math.round((endMs - nowMs) / 60000));

			results.set(item.id, {
				...toEpgProgram(prog),
				progress,
				remainingMinutes
			});
		}

		return results;
	}

	/**
	 * Get next program after the current one.
	 */
	async getNextProgram(lineupItemId: string): Promise<EpgProgram | null> {
		const now = new Date();
		const nowIso = now.toISOString();

		// Get the lineup item
		const items = await db
			.select()
			.from(channelLineupItems)
			.where(eq(channelLineupItems.id, lineupItemId))
			.limit(1);

		if (items.length === 0) return null;

		const item = items[0];

		// Find next program (starts after now)
		const programs = await db
			.select()
			.from(epgPrograms)
			.where(
				and(
					eq(epgPrograms.channelXmltvId, item.channelId),
					eq(epgPrograms.accountId, item.accountId),
					gte(epgPrograms.startTime, nowIso)
				)
			)
			.orderBy(epgPrograms.startTime)
			.limit(1);

		if (programs.length === 0) return null;

		return toEpgProgram(programs[0]);
	}

	/**
	 * Clean up old EPG data.
	 * @param hoursOld Delete programs that ended more than this many hours ago
	 */
	async cleanupOldPrograms(hoursOld: number = 24): Promise<number> {
		const cutoff = new Date(Date.now() - hoursOld * 60 * 60 * 1000).toISOString();

		const result = await db.delete(epgPrograms).where(lte(epgPrograms.endTime, cutoff));

		const deleted = result.changes ?? 0;
		if (deleted > 0) {
			logger.info('[EpgService] Cleaned up old EPG programs', { deleted, hoursOld });
		}

		return deleted;
	}

	/**
	 * Get EPG program count.
	 */
	async getProgramCount(): Promise<number> {
		const result = await db.select({ count: sql<number>`count(*)` }).from(epgPrograms);
		return result[0]?.count || 0;
	}

	/**
	 * Convert provider timestamp or time string to ISO format.
	 */
	private timestampToIso(timestamp: number, timeStr: string): string | null {
		if (timestamp > 0) {
			return new Date(timestamp * 1000).toISOString();
		}

		// Try parsing the time string (format: "YYYY-MM-DD HH:MM:SS")
		if (timeStr) {
			try {
				const date = new Date(timeStr.replace(' ', 'T') + 'Z');
				if (!isNaN(date.getTime())) {
					return date.toISOString();
				}
			} catch {
				// Fall through
			}
		}

		return null;
	}

	// ========================================================================
	// XMLTV Source Management
	// ========================================================================

	/**
	 * Get all XMLTV sources.
	 */
	async getXmltvSources(): Promise<EpgSourceRecord[]> {
		return db.select().from(epgSources).orderBy(asc(epgSources.priority));
	}

	/**
	 * Get a single XMLTV source by ID.
	 */
	async getXmltvSource(id: string): Promise<EpgSourceRecord | null> {
		const sources = await db.select().from(epgSources).where(eq(epgSources.id, id)).limit(1);
		return sources.length > 0 ? sources[0] : null;
	}

	/**
	 * Add a new XMLTV source.
	 */
	async addXmltvSource(name: string, url: string): Promise<EpgSourceRecord> {
		const now = new Date().toISOString();
		const [source] = await db
			.insert(epgSources)
			.values({
				id: randomUUID(),
				name,
				url,
				enabled: true,
				priority: 1,
				status: 'pending',
				createdAt: now,
				updatedAt: now
			})
			.returning();

		logger.info('[EpgService] Added XMLTV source', { id: source.id, name, url });
		return source;
	}

	/**
	 * Update an XMLTV source.
	 */
	async updateXmltvSource(
		id: string,
		updates: { name?: string; url?: string; enabled?: boolean; priority?: number }
	): Promise<EpgSourceRecord | null> {
		const now = new Date().toISOString();
		const [updated] = await db
			.update(epgSources)
			.set({ ...updates, updatedAt: now })
			.where(eq(epgSources.id, id))
			.returning();

		return updated || null;
	}

	/**
	 * Delete an XMLTV source.
	 */
	async deleteXmltvSource(id: string): Promise<boolean> {
		const result = await db.delete(epgSources).where(eq(epgSources.id, id));
		return (result.changes ?? 0) > 0;
	}

	/**
	 * Fetch and store EPG from an XMLTV source.
	 */
	async fetchXmltvSource(sourceId: string): Promise<number> {
		const source = await this.getXmltvSource(sourceId);
		if (!source) {
			throw new Error('XMLTV source not found');
		}

		if (!source.enabled) {
			logger.info('[EpgService] XMLTV source disabled', { sourceId });
			return 0;
		}

		const parser = getXmltvParser();
		const now = new Date().toISOString();

		try {
			const xmltvData = await parser.fetchAndParse(source.url);

			// Delete existing programs from this source
			await db.delete(epgPrograms).where(eq(epgPrograms.epgSourceId, sourceId));

			let programCount = 0;

			// Insert new programs
			for (const prog of xmltvData.programs) {
				await db.insert(epgPrograms).values({
					id: randomUUID(),
					channelXmltvId: prog.channel,
					epgSourceId: sourceId,
					accountId: null,
					startTime: prog.start.toISOString(),
					endTime: prog.stop.toISOString(),
					title: prog.title,
					description: prog.description || null,
					category: prog.category || null,
					icon: prog.icon || null,
					rating: prog.rating || null,
					episodeNumber: prog.episodeNum || null,
					createdAt: now
				});
				programCount++;
			}

			// Update source status
			await db
				.update(epgSources)
				.set({
					status: 'ok',
					errorMessage: null,
					lastFetchedAt: now,
					channelCount: xmltvData.channels.length,
					updatedAt: now
				})
				.where(eq(epgSources.id, sourceId));

			logger.info('[EpgService] Fetched XMLTV source', {
				sourceId,
				name: source.name,
				channels: xmltvData.channels.length,
				programs: programCount
			});

			return programCount;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			// Update source with error status
			await db
				.update(epgSources)
				.set({
					status: 'error',
					errorMessage,
					updatedAt: now
				})
				.where(eq(epgSources.id, sourceId));

			logger.error('[EpgService] Failed to fetch XMLTV source', {
				sourceId,
				error: errorMessage
			});

			throw error;
		}
	}

	/**
	 * Fetch all enabled XMLTV sources.
	 */
	async fetchAllXmltvSources(): Promise<Map<string, number>> {
		const results = new Map<string, number>();
		const sources = await db.select().from(epgSources).where(eq(epgSources.enabled, true));

		for (const source of sources) {
			try {
				const count = await this.fetchXmltvSource(source.id);
				results.set(source.id, count);
			} catch (error) {
				logger.error('[EpgService] Failed to fetch XMLTV source', {
					sourceId: source.id,
					error: error instanceof Error ? error.message : 'Unknown error'
				});
				results.set(source.id, 0);
			}
		}

		return results;
	}
}

// Singleton instance
let instance: EpgService | null = null;

export function getEpgService(): EpgService {
	if (!instance) {
		instance = new EpgService();
	}
	return instance;
}

export type { EpgService };
