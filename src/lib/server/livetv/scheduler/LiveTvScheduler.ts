/**
 * Live TV Scheduler Service
 *
 * Orchestrates background tasks for Live TV:
 * - Channel sync: Sync lineup with providers (24h)
 * - Provider EPG: Fetch EPG from Stalker Portal accounts (4h)
 * - XMLTV refresh: Refresh external XMLTV sources (6h)
 * - EPG cleanup: Remove old EPG data (24h)
 *
 * Follows the same patterns as MonitoringScheduler.
 */

import { db } from '$lib/server/db/index.js';
import { liveTvSettings } from '$lib/server/db/schema.js';
import { EventEmitter } from 'events';
import { logger } from '$lib/logging';
import type { BackgroundService, ServiceStatus } from '$lib/server/services/background-service.js';
import { getChannelSyncService } from '../sync/ChannelSyncService.js';
import { getEpgService } from '../epg/EpgService.js';

/**
 * Default intervals in hours for each task type
 */
const DEFAULT_INTERVALS = {
	channelSync: 24,
	providerEpg: 4,
	xmltvRefresh: 6,
	epgCleanup: 24
} as const;

/**
 * Minimum interval in hours
 */
const MIN_INTERVAL_HOURS = 0.5; // 30 minutes

/**
 * Scheduler poll interval in milliseconds (how often to check for due tasks)
 */
const SCHEDULER_POLL_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Grace period after startup before any automated tasks run (in milliseconds)
 */
const STARTUP_GRACE_PERIOD_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Live TV scheduler settings
 */
export interface LiveTvSchedulerSettings {
	channelSyncIntervalHours: number;
	providerEpgIntervalHours: number;
	xmltvRefreshIntervalHours: number;
	epgCleanupIntervalHours: number;
	autoSyncEnabled: boolean;
	autoEpgEnabled: boolean;
}

/**
 * Task execution result
 */
export interface LiveTvTaskResult {
	taskType: string;
	itemsProcessed: number;
	errors: string[];
	executedAt: Date;
}

/**
 * Task status
 */
interface TaskStatus {
	lastRunTime: Date | null;
	nextRunTime: Date | null;
	intervalHours: number;
	isRunning: boolean;
}

/**
 * Scheduler status response
 */
export interface LiveTvSchedulerStatus {
	tasks: {
		channelSync: TaskStatus;
		providerEpg: TaskStatus;
		xmltvRefresh: TaskStatus;
		epgCleanup: TaskStatus;
	};
}

/**
 * LiveTvScheduler - Coordinate all Live TV background tasks
 */
export class LiveTvScheduler extends EventEmitter implements BackgroundService {
	private static instance: LiveTvScheduler | null = null;

	readonly name = 'LiveTvScheduler';
	private _status: ServiceStatus = 'pending';
	private _error?: Error;

	private schedulerTimer: NodeJS.Timeout | null = null;
	private lastRunTimes: Map<string, Date> = new Map();
	private taskIntervals: Map<string, number> = new Map();
	private runningTasks: Set<string> = new Set();
	private isInitialized = false;
	private startupTime: Date | null = null;

	private constructor() {
		super();
	}

	get status(): ServiceStatus {
		return this._status;
	}

	get error(): Error | undefined {
		return this._error;
	}

	static getInstance(): LiveTvScheduler {
		if (!LiveTvScheduler.instance) {
			LiveTvScheduler.instance = new LiveTvScheduler();
		}
		return LiveTvScheduler.instance;
	}

	static async resetInstance(): Promise<void> {
		if (LiveTvScheduler.instance) {
			await LiveTvScheduler.instance.stop();
			LiveTvScheduler.instance = null;
		}
	}

	/**
	 * Load last-run times from database
	 */
	private async loadLastRunTimes(): Promise<void> {
		const settings = await db.select().from(liveTvSettings);
		const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

		const taskTypes = ['channelSync', 'providerEpg', 'xmltvRefresh', 'epgCleanup'];
		for (const taskType of taskTypes) {
			const key = `last_run_${taskType}`;
			const value = settingsMap.get(key);
			if (value) {
				const date = new Date(value);
				if (!isNaN(date.getTime())) {
					this.lastRunTimes.set(taskType, date);
					logger.debug(`[LiveTvScheduler] Loaded last run time for ${taskType}`, {
						taskType,
						lastRunTime: date.toISOString()
					});
				}
			}
		}
	}

	/**
	 * Save last-run time to database
	 */
	private async saveLastRunTime(taskType: string, time: Date): Promise<void> {
		const key = `last_run_${taskType}`;
		try {
			await db
				.insert(liveTvSettings)
				.values({ key, value: time.toISOString() })
				.onConflictDoUpdate({ target: liveTvSettings.key, set: { value: time.toISOString() } });
		} catch (error) {
			logger.error(`[LiveTvScheduler] Failed to save last run time for ${taskType}`, error);
		}
	}

	/**
	 * Get scheduler settings from database
	 */
	async getSettings(): Promise<LiveTvSchedulerSettings> {
		const settings = await db.select().from(liveTvSettings);
		const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

		return {
			channelSyncIntervalHours: parseFloat(
				settingsMap.get('channel_sync_interval_hours') || String(DEFAULT_INTERVALS.channelSync)
			),
			providerEpgIntervalHours: parseFloat(
				settingsMap.get('provider_epg_interval_hours') || String(DEFAULT_INTERVALS.providerEpg)
			),
			xmltvRefreshIntervalHours: parseFloat(
				settingsMap.get('xmltv_refresh_interval_hours') || String(DEFAULT_INTERVALS.xmltvRefresh)
			),
			epgCleanupIntervalHours: parseFloat(
				settingsMap.get('epg_cleanup_interval_hours') || String(DEFAULT_INTERVALS.epgCleanup)
			),
			autoSyncEnabled: settingsMap.get('auto_sync_enabled') !== 'false',
			autoEpgEnabled: settingsMap.get('auto_epg_enabled') !== 'false'
		};
	}

	/**
	 * Update scheduler settings
	 */
	async updateSettings(settings: Partial<LiveTvSchedulerSettings>): Promise<void> {
		const updates: Array<{ key: string; value: string }> = [];

		if (settings.channelSyncIntervalHours !== undefined) {
			updates.push({
				key: 'channel_sync_interval_hours',
				value: String(settings.channelSyncIntervalHours)
			});
		}
		if (settings.providerEpgIntervalHours !== undefined) {
			updates.push({
				key: 'provider_epg_interval_hours',
				value: String(settings.providerEpgIntervalHours)
			});
		}
		if (settings.xmltvRefreshIntervalHours !== undefined) {
			updates.push({
				key: 'xmltv_refresh_interval_hours',
				value: String(settings.xmltvRefreshIntervalHours)
			});
		}
		if (settings.epgCleanupIntervalHours !== undefined) {
			updates.push({
				key: 'epg_cleanup_interval_hours',
				value: String(settings.epgCleanupIntervalHours)
			});
		}
		if (settings.autoSyncEnabled !== undefined) {
			updates.push({ key: 'auto_sync_enabled', value: String(settings.autoSyncEnabled) });
		}
		if (settings.autoEpgEnabled !== undefined) {
			updates.push({ key: 'auto_epg_enabled', value: String(settings.autoEpgEnabled) });
		}

		for (const { key, value } of updates) {
			await db
				.insert(liveTvSettings)
				.values({ key, value })
				.onConflictDoUpdate({ target: liveTvSettings.key, set: { value } });
		}

		// Restart scheduler if intervals changed
		if (Object.keys(settings).some((k) => k.includes('Interval'))) {
			await this.restart();
		}

		this.emit('settingsUpdated', settings);
	}

	/**
	 * Start the scheduler (non-blocking)
	 */
	start(): void {
		if (this.isInitialized || this._status === 'starting') {
			logger.debug('[LiveTvScheduler] Already initialized or starting');
			return;
		}

		this._status = 'starting';
		logger.info('[LiveTvScheduler] Starting...');

		setImmediate(() => {
			this.initialize()
				.then(() => {
					this._status = 'ready';
				})
				.catch((err) => {
					this._error = err instanceof Error ? err : new Error(String(err));
					this._status = 'error';
					logger.error('[LiveTvScheduler] Failed to initialize', this._error);
				});
		});
	}

	/**
	 * Initialize the scheduler
	 */
	async initialize(): Promise<void> {
		if (this.isInitialized) {
			logger.debug('[LiveTvScheduler] Already initialized');
			return;
		}

		logger.info('[LiveTvScheduler] Initializing...');
		this.startupTime = new Date();

		await this.loadLastRunTimes();

		const settings = await this.getSettings();

		// Store task intervals
		this.taskIntervals.set(
			'channelSync',
			Math.max(settings.channelSyncIntervalHours, MIN_INTERVAL_HOURS)
		);
		this.taskIntervals.set(
			'providerEpg',
			Math.max(settings.providerEpgIntervalHours, MIN_INTERVAL_HOURS)
		);
		this.taskIntervals.set(
			'xmltvRefresh',
			Math.max(settings.xmltvRefreshIntervalHours, MIN_INTERVAL_HOURS)
		);
		this.taskIntervals.set(
			'epgCleanup',
			Math.max(settings.epgCleanupIntervalHours, MIN_INTERVAL_HOURS)
		);

		// Log scheduled intervals
		for (const [taskType, intervalHours] of this.taskIntervals.entries()) {
			const lastRun = this.lastRunTimes.get(taskType);
			logger.info(`[LiveTvScheduler] Task ${taskType} configured`, {
				taskType,
				intervalHours,
				lastRunTime: lastRun?.toISOString() ?? 'never'
			});
		}

		// Start polling scheduler
		this.schedulerTimer = setInterval(() => {
			this.pollAndExecuteDueTasks().catch((error) => {
				logger.error('[LiveTvScheduler] Error in scheduler poll', error);
			});
		}, SCHEDULER_POLL_INTERVAL_MS);

		this.isInitialized = true;

		const gracePeriodMinutes = Math.round(STARTUP_GRACE_PERIOD_MS / 60000);
		logger.info(
			`[LiveTvScheduler] Initialized - tasks will start after ${gracePeriodMinutes} minute grace period`
		);
	}

	/**
	 * Poll for due tasks and execute them
	 */
	private async pollAndExecuteDueTasks(): Promise<void> {
		// Check startup grace period
		if (this.startupTime) {
			const timeSinceStartup = Date.now() - this.startupTime.getTime();
			if (timeSinceStartup < STARTUP_GRACE_PERIOD_MS) {
				return;
			}
		}

		const settings = await this.getSettings();
		const now = new Date();

		const tasksToCheck = Array.from(this.taskIntervals.entries());

		for (const [taskType, intervalHours] of tasksToCheck) {
			// Skip disabled tasks
			if (taskType === 'channelSync' && !settings.autoSyncEnabled) continue;
			if ((taskType === 'providerEpg' || taskType === 'xmltvRefresh') && !settings.autoEpgEnabled)
				continue;

			// Skip if already running
			if (this.runningTasks.has(taskType)) continue;

			const lastRunTime = this.lastRunTimes.get(taskType);
			const intervalMs = intervalHours * 60 * 60 * 1000;

			let isDue = false;
			if (!lastRunTime) {
				isDue = true;
				logger.debug(`[LiveTvScheduler] Task ${taskType} has never run, marking as due`);
			} else {
				const timeSinceLastRun = now.getTime() - lastRunTime.getTime();
				isDue = timeSinceLastRun >= intervalMs;
			}

			if (isDue) {
				if (this.runningTasks.has(taskType)) continue;
				this.runningTasks.add(taskType);

				this.executeTask(taskType).catch((error) => {
					logger.error(`[LiveTvScheduler] Task ${taskType} failed`, error);
				});
			}
		}
	}

	/**
	 * Execute a specific task
	 */
	private async executeTask(taskType: string): Promise<void> {
		this.emit('taskStarted', taskType);
		logger.info(`[LiveTvScheduler] Executing ${taskType} task...`);

		try {
			const result = await this.runTask(taskType);
			const completionTime = new Date();

			await this.saveLastRunTime(taskType, completionTime);
			this.lastRunTimes.set(taskType, completionTime);

			this.emit('taskCompleted', taskType, result);
			logger.info(`[LiveTvScheduler] ${taskType} task completed`, {
				taskType,
				itemsProcessed: result.itemsProcessed,
				errors: result.errors.length
			});
		} catch (error) {
			logger.error(`[LiveTvScheduler] ${taskType} task failed`, error);
			this.emit('taskFailed', taskType, error);
		} finally {
			this.runningTasks.delete(taskType);
		}
	}

	/**
	 * Run a specific task
	 */
	private async runTask(taskType: string): Promise<LiveTvTaskResult> {
		switch (taskType) {
			case 'channelSync': {
				const syncService = getChannelSyncService();
				const results = await syncService.syncAllAccounts({
					addNewChannels: true,
					removeStaleChannels: true,
					updateMetadata: true
				});
				let totalAdded = 0;
				let totalRemoved = 0;
				const errors: string[] = [];

				for (const result of results.values()) {
					totalAdded += result.added;
					totalRemoved += result.removed;
					errors.push(...result.errors);
				}

				return {
					taskType,
					itemsProcessed: totalAdded + totalRemoved,
					errors,
					executedAt: new Date()
				};
			}

			case 'providerEpg': {
				const epgService = getEpgService();
				const results = await epgService.fetchAllProviderEpg(6);
				let totalPrograms = 0;
				const errors: string[] = [];

				for (const [accountId, count] of results.entries()) {
					if (count < 0) {
						errors.push(`Account ${accountId} failed to fetch EPG`);
					} else {
						totalPrograms += count;
					}
				}

				return {
					taskType,
					itemsProcessed: totalPrograms,
					errors,
					executedAt: new Date()
				};
			}

			case 'xmltvRefresh': {
				const epgService = getEpgService();
				const results = await epgService.fetchAllXmltvSources();
				let totalPrograms = 0;
				const errors: string[] = [];

				for (const [sourceId, count] of results.entries()) {
					if (count < 0) {
						errors.push(`Source ${sourceId} failed to fetch`);
					} else {
						totalPrograms += count;
					}
				}

				return {
					taskType,
					itemsProcessed: totalPrograms,
					errors,
					executedAt: new Date()
				};
			}

			case 'epgCleanup': {
				const epgService = getEpgService();
				const removed = await epgService.cleanupOldPrograms(24);

				return {
					taskType,
					itemsProcessed: removed,
					errors: [],
					executedAt: new Date()
				};
			}

			default:
				throw new Error(`Unknown task type: ${taskType}`);
		}
	}

	/**
	 * Manually trigger a task
	 */
	async runChannelSync(): Promise<LiveTvTaskResult> {
		return this.executeTaskManually('channelSync');
	}

	async runProviderEpg(): Promise<LiveTvTaskResult> {
		return this.executeTaskManually('providerEpg');
	}

	async runXmltvRefresh(): Promise<LiveTvTaskResult> {
		return this.executeTaskManually('xmltvRefresh');
	}

	async runEpgCleanup(): Promise<LiveTvTaskResult> {
		return this.executeTaskManually('epgCleanup');
	}

	private async executeTaskManually(taskType: string): Promise<LiveTvTaskResult> {
		if (this.runningTasks.has(taskType)) {
			throw new Error(`Task ${taskType} is already running`);
		}

		this.runningTasks.add(taskType);
		logger.info(`[LiveTvScheduler] Manually executing ${taskType} task...`);
		this.emit('manualTaskStarted', taskType);

		try {
			const result = await this.runTask(taskType);
			const completionTime = new Date();

			await this.saveLastRunTime(taskType, completionTime);
			this.lastRunTimes.set(taskType, completionTime);

			this.emit('manualTaskCompleted', taskType, result);
			return result;
		} catch (error) {
			logger.error(`[LiveTvScheduler] Manual ${taskType} task failed`, error);
			this.emit('manualTaskFailed', taskType, error);
			throw error;
		} finally {
			this.runningTasks.delete(taskType);
		}
	}

	/**
	 * Stop the scheduler
	 */
	async stop(): Promise<void> {
		logger.info('[LiveTvScheduler] Stopping...');

		if (this.schedulerTimer) {
			clearInterval(this.schedulerTimer);
			this.schedulerTimer = null;
		}

		this.removeAllListeners();
		this.isInitialized = false;
		this.startupTime = null;
		this._status = 'pending';
		logger.info('[LiveTvScheduler] Stopped');
	}

	/**
	 * Restart the scheduler
	 */
	private async restart(): Promise<void> {
		await this.stop();
		this.isInitialized = false;
		await this.initialize();
	}

	/**
	 * Get current scheduler status
	 */
	async getStatus(): Promise<LiveTvSchedulerStatus> {
		const settings = await this.getSettings();

		const getTaskStatus = (taskType: string, intervalHours: number): TaskStatus => {
			const lastRunTime = this.lastRunTimes.get(taskType) || null;
			const nextRunTime = lastRunTime
				? new Date(lastRunTime.getTime() + intervalHours * 60 * 60 * 1000)
				: null;

			return {
				lastRunTime,
				nextRunTime,
				intervalHours,
				isRunning: this.runningTasks.has(taskType)
			};
		};

		return {
			tasks: {
				channelSync: getTaskStatus('channelSync', settings.channelSyncIntervalHours),
				providerEpg: getTaskStatus('providerEpg', settings.providerEpgIntervalHours),
				xmltvRefresh: getTaskStatus('xmltvRefresh', settings.xmltvRefreshIntervalHours),
				epgCleanup: getTaskStatus('epgCleanup', settings.epgCleanupIntervalHours)
			}
		};
	}
}

// Singleton getter
export function getLiveTvScheduler(): LiveTvScheduler {
	return LiveTvScheduler.getInstance();
}

// Reset singleton (for testing)
export async function resetLiveTvScheduler(): Promise<void> {
	await LiveTvScheduler.resetInstance();
}
