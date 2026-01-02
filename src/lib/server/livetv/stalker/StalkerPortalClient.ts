/**
 * StalkerPortalClient - HTTP client for Stalker Portal/MAG STB IPTV APIs.
 *
 * Handles authentication via MAC address handshake and provides methods
 * to fetch account info, categories, and channels from Stalker Portal servers.
 */

import { logger } from '$lib/logging';

export interface StalkerPortalConfig {
	portalUrl: string;
	macAddress: string;
}

interface StalkerToken {
	token: string;
	expiresAt: number;
}

export interface StalkerAccountInfo {
	expDate: string | null;
	maxConnections: number;
	activeConnections: number;
	status: string;
	tariffName: string | null;
	phone: string | null;
}

export interface StalkerCategory {
	id: string;
	title: string;
	alias: string;
	number: number;
	censored: boolean;
}

export interface StalkerChannel {
	id: string;
	name: string;
	number: number;
	logo: string;
	categoryId: string;
	cmd: string;
	archive: boolean;
	archiveDays: number;
	xmltvId: string;
}

export interface StalkerTestResult {
	success: boolean;
	error?: string;
	accountInfo?: StalkerAccountInfo;
	serverInfo?: {
		timezone: string;
		serverTimestamp: number;
	};
	contentStats?: {
		liveChannels: number;
		liveCategories: number;
		vodItems: number;
	};
}

export interface StalkerEpgProgram {
	id: string;
	channelId: string;
	startTime: string; // ISO timestamp
	endTime: string; // ISO timestamp
	startTimestamp: number;
	endTimestamp: number;
	title: string;
	description: string;
	category: string;
	hasArchive: boolean;
}

export interface StalkerEpgData {
	programs: Map<string, StalkerEpgProgram[]>; // Map of channelId -> programs
}

// User agent that mimics MAG STB devices
const STB_USER_AGENT =
	'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3';

// Token validity duration (refresh 5 minutes before expiry)
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;

export class StalkerPortalClient {
	private config: StalkerPortalConfig;
	private token: StalkerToken | null = null;

	constructor(config: StalkerPortalConfig) {
		this.config = config;
	}

	/**
	 * Get the base portal URL, ensuring it ends with /portal.php or /c/
	 */
	private getPortalBaseUrl(): string {
		let url = this.config.portalUrl.trim();
		// Remove trailing slash
		if (url.endsWith('/')) {
			url = url.slice(0, -1);
		}
		// Handle common URL patterns
		if (url.endsWith('/c')) {
			return url + '/portal.php';
		}
		if (url.endsWith('/portal.php')) {
			return url;
		}
		// Append portal.php if not present
		return url + '/portal.php';
	}

	/**
	 * URL encode MAC address for cookies (: becomes %3A)
	 */
	private getEncodedMac(): string {
		return encodeURIComponent(this.config.macAddress);
	}

	/**
	 * Build common headers for requests
	 */
	private getHeaders(includeAuth: boolean = false): Record<string, string> {
		const headers: Record<string, string> = {
			'User-Agent': STB_USER_AGENT,
			Cookie: `mac=${this.getEncodedMac()}; timezone=UTC; stb_lang=en`
		};

		if (includeAuth && this.token) {
			headers['Authorization'] = `Bearer ${this.token.token}`;
		}

		return headers;
	}

	/**
	 * Perform handshake to get authentication token
	 */
	private async handshake(): Promise<string> {
		const url = `${this.getPortalBaseUrl()}?type=stb&action=handshake&JsHttpRequest=1-xml`;

		logger.debug('[StalkerPortalClient] Performing handshake', {
			portalUrl: this.config.portalUrl,
			mac: this.config.macAddress
		});

		const response = await fetch(url, {
			method: 'GET',
			headers: this.getHeaders(false)
		});

		if (!response.ok) {
			throw new Error(`Handshake failed: HTTP ${response.status}`);
		}

		const data = await response.json();

		// Stalker Portal wraps response in js object
		const token = data?.js?.token;
		if (!token) {
			throw new Error('Handshake failed: No token in response');
		}

		logger.debug('[StalkerPortalClient] Handshake successful', {
			token: token.substring(0, 8) + '...'
		});

		return token;
	}

	/**
	 * Ensure we have a valid token, refreshing if needed
	 */
	private async ensureToken(): Promise<string> {
		const now = Date.now();

		// Check if current token is still valid
		if (this.token && this.token.expiresAt > now + TOKEN_REFRESH_MARGIN_MS) {
			return this.token.token;
		}

		// Get new token
		const token = await this.handshake();

		// Tokens typically last 1 hour, we'll assume 30 minutes to be safe
		this.token = {
			token,
			expiresAt: now + 30 * 60 * 1000
		};

		return token;
	}

	/**
	 * Make an authenticated API request
	 */
	private async apiRequest<T>(
		type: string,
		action: string,
		params: Record<string, string> = {}
	): Promise<T> {
		await this.ensureToken();

		const queryParams = new URLSearchParams({
			type,
			action,
			JsHttpRequest: '1-xml',
			...params
		});

		const url = `${this.getPortalBaseUrl()}?${queryParams.toString()}`;

		const response = await fetch(url, {
			method: 'GET',
			headers: this.getHeaders(true)
		});

		if (!response.ok) {
			throw new Error(`API request failed: HTTP ${response.status}`);
		}

		const data = await response.json();

		// Handle Stalker Portal error responses
		if (data?.js?.error) {
			throw new Error(`Portal error: ${data.js.error}`);
		}

		return data?.js as T;
	}

	/**
	 * Get account information
	 */
	async getAccountInfo(): Promise<StalkerAccountInfo> {
		// Get account info - expiry date is in the 'phone' field for most portals
		const accountData = await this.apiRequest<{
			phone?: string;
			mac?: string;
		}>('account_info', 'get_main_info');

		// Get profile for status (status=1 means active)
		let status = 'unknown';
		let maxConnections = 1;
		try {
			const profile = await this.apiRequest<{
				status?: number;
				playback_limit?: number;
			}>('stb', 'get_profile');
			status = profile.status === 1 ? 'active' : 'inactive';
			if (profile.playback_limit) {
				maxConnections = profile.playback_limit;
			}
		} catch {
			// Profile might not be available on all portals
		}

		return {
			expDate: accountData.phone || null, // phone field contains expiry date
			maxConnections,
			activeConnections: 0,
			status,
			tariffName: null,
			phone: null
		};
	}

	/**
	 * Get STB profile information (for additional account details)
	 */
	async getProfile(): Promise<Record<string, unknown>> {
		return this.apiRequest('stb', 'get_profile');
	}

	/**
	 * Get all channel categories (genres)
	 */
	async getCategories(): Promise<StalkerCategory[]> {
		const data = await this.apiRequest<
			Array<{
				id: string;
				title: string;
				alias: string;
				number?: string;
				censored?: number;
			}>
		>('itv', 'get_genres');

		if (!Array.isArray(data)) {
			return [];
		}

		return data.map((cat, idx) => ({
			id: cat.id,
			title: cat.title,
			alias: cat.alias || '',
			number: parseInt(cat.number || String(idx + 1), 10),
			censored: cat.censored === 1
		}));
	}

	/**
	 * Get all live TV channels
	 */
	async getAllChannels(): Promise<StalkerChannel[]> {
		const data = await this.apiRequest<{
			data: Array<{
				id: string;
				name: string;
				number: string;
				logo: string;
				tv_genre_id: string;
				cmd: string;
				tv_archive: number;
				tv_archive_duration: number;
				xmltv_id: string;
			}>;
		}>('itv', 'get_all_channels');

		if (!data?.data || !Array.isArray(data.data)) {
			return [];
		}

		return data.data.map((ch) => ({
			id: ch.id,
			name: ch.name,
			number: parseInt(ch.number, 10) || 0,
			logo: ch.logo || '',
			categoryId: ch.tv_genre_id,
			cmd: ch.cmd,
			archive: ch.tv_archive === 1,
			archiveDays: ch.tv_archive_duration || 0,
			xmltvId: ch.xmltv_id || ''
		}));
	}

	/**
	 * Get channels by category/genre
	 */
	async getChannelsByCategory(categoryId: string): Promise<StalkerChannel[]> {
		const data = await this.apiRequest<{
			data: Array<{
				id: string;
				name: string;
				number: string;
				logo: string;
				tv_genre_id: string;
				cmd: string;
				tv_archive: number;
				tv_archive_duration: number;
				xmltv_id: string;
			}>;
		}>('itv', 'get_ordered_list', {
			genre: categoryId,
			sortby: 'number'
		});

		if (!data?.data || !Array.isArray(data.data)) {
			return [];
		}

		return data.data.map((ch) => ({
			id: ch.id,
			name: ch.name,
			number: parseInt(ch.number, 10) || 0,
			logo: ch.logo || '',
			categoryId: ch.tv_genre_id,
			cmd: ch.cmd,
			archive: ch.tv_archive === 1,
			archiveDays: ch.tv_archive_duration || 0,
			xmltvId: ch.xmltv_id || ''
		}));
	}

	/**
	 * Get stream URL for a channel
	 */
	async getStreamUrl(cmd: string): Promise<string> {
		const data = await this.apiRequest<{
			cmd: string;
		}>('itv', 'create_link', {
			cmd: cmd // URLSearchParams already encodes, don't double-encode
		});

		if (!data?.cmd) {
			throw new Error('Failed to get stream URL');
		}

		// Stream URL is typically in format "ffmpeg http://..."
		let streamUrl = data.cmd;
		if (streamUrl.startsWith('ffmpeg ')) {
			streamUrl = streamUrl.substring(7);
		}

		return streamUrl;
	}

	/**
	 * Get HTTP headers needed for stream access.
	 * These must be passed to FFmpeg for authenticated streams.
	 */
	async getStreamHeaders(): Promise<Record<string, string>> {
		await this.ensureToken();
		return {
			'User-Agent': STB_USER_AGENT,
			Cookie: `mac=${this.getEncodedMac()}; timezone=UTC; stb_lang=en`
		};
	}

	/**
	 * Get VOD total count
	 */
	async getVodCount(): Promise<number> {
		try {
			const data = await this.apiRequest<{
				total_items?: number | string;
			}>('vod', 'get_ordered_list', { p: '1' });
			return typeof data.total_items === 'string'
				? parseInt(data.total_items, 10)
				: data.total_items || 0;
		} catch {
			return 0;
		}
	}

	/**
	 * Get EPG (Electronic Program Guide) data for all channels.
	 * @param period Number of hours of EPG data to fetch (default: 4)
	 * @returns Map of channel ID to array of programs
	 */
	async getEpgInfo(period: number = 4): Promise<StalkerEpgData> {
		const result: StalkerEpgData = {
			programs: new Map()
		};

		try {
			const data = await this.apiRequest<{
				data: Record<
					string,
					Array<{
						id: string;
						ch_id: string;
						time: string;
						time_to: string;
						start_timestamp: number;
						stop_timestamp: number;
						name: string;
						descr: string;
						category?: string;
						mark_archive?: number;
					}>
				>;
			}>('itv', 'get_epg_info', { period: String(period) });

			if (!data?.data || typeof data.data !== 'object') {
				logger.warn('[StalkerPortalClient] No EPG data returned');
				return result;
			}

			// Data is keyed by channel ID
			for (const [channelId, programs] of Object.entries(data.data)) {
				if (!Array.isArray(programs)) continue;

				const mappedPrograms: StalkerEpgProgram[] = programs.map((prog) => ({
					id: prog.id || '',
					channelId: prog.ch_id || channelId,
					startTime: prog.time || '',
					endTime: prog.time_to || '',
					startTimestamp: prog.start_timestamp || 0,
					endTimestamp: prog.stop_timestamp || 0,
					title: prog.name || '',
					description: prog.descr || '',
					category: prog.category || '',
					hasArchive: prog.mark_archive === 1
				}));

				result.programs.set(channelId, mappedPrograms);
			}

			logger.debug('[StalkerPortalClient] Fetched EPG data', {
				channels: result.programs.size,
				period
			});
		} catch (error) {
			logger.error('[StalkerPortalClient] Failed to fetch EPG', {
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}

		return result;
	}

	/**
	 * Get short EPG (current/next program) for a specific channel.
	 */
	async getShortEpg(channelId: string): Promise<StalkerEpgProgram[]> {
		try {
			const data = await this.apiRequest<{
				data: Array<{
					id: string;
					ch_id: string;
					time: string;
					time_to: string;
					start_timestamp: number;
					stop_timestamp: number;
					name: string;
					descr: string;
					category?: string;
					mark_archive?: number;
				}>;
			}>('itv', 'get_short_epg', { ch_id: channelId });

			if (!data?.data || !Array.isArray(data.data)) {
				return [];
			}

			return data.data.map((prog) => ({
				id: prog.id || '',
				channelId: prog.ch_id || channelId,
				startTime: prog.time || '',
				endTime: prog.time_to || '',
				startTimestamp: prog.start_timestamp || 0,
				endTimestamp: prog.stop_timestamp || 0,
				title: prog.name || '',
				description: prog.descr || '',
				category: prog.category || '',
				hasArchive: prog.mark_archive === 1
			}));
		} catch (error) {
			logger.error('[StalkerPortalClient] Failed to fetch short EPG', {
				channelId,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
			return [];
		}
	}

	/**
	 * Test connection to portal
	 */
	async test(): Promise<StalkerTestResult> {
		try {
			// First, try handshake
			await this.handshake();

			// Then get account info
			const accountInfo = await this.getAccountInfo();

			// Try to get profile for server info
			let serverInfo: { timezone: string; serverTimestamp: number } | undefined;
			try {
				const profile = await this.getProfile();
				if (profile) {
					serverInfo = {
						timezone: (profile.timezone as string) || 'UTC',
						serverTimestamp: (profile.now as number) || Date.now() / 1000
					};
				}
			} catch {
				// Profile not required for test success
			}

			// Get content stats (channels, categories, VOD)
			let contentStats:
				| { liveChannels: number; liveCategories: number; vodItems: number }
				| undefined;
			try {
				const [channels, categories, vodCount] = await Promise.all([
					this.getAllChannels(),
					this.getCategories(),
					this.getVodCount()
				]);
				contentStats = {
					liveChannels: channels.length,
					liveCategories: categories.length,
					vodItems: vodCount
				};
			} catch {
				// Content stats not required for test success
			}

			return {
				success: true,
				accountInfo,
				serverInfo,
				contentStats
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			logger.error('[StalkerPortalClient] Test failed', { error: message });

			return {
				success: false,
				error: message
			};
		}
	}

	/**
	 * Clear cached token (useful when credentials change)
	 */
	clearToken(): void {
		this.token = null;
	}
}
