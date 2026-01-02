/**
 * XmltvParser - Parses XMLTV format EPG feeds.
 * XMLTV is a standard XML format for TV program listings.
 */

import { logger } from '$lib/logging';
import { gunzipSync } from 'zlib';

export interface XmltvChannel {
	id: string;
	displayName: string;
	icon?: string;
}

export interface XmltvProgram {
	channel: string;
	start: Date;
	stop: Date;
	title: string;
	description?: string;
	category?: string;
	icon?: string;
	rating?: string;
	episodeNum?: string;
}

export interface XmltvData {
	channels: XmltvChannel[];
	programs: XmltvProgram[];
}

/**
 * Parse XMLTV time format to Date.
 * Format: YYYYMMDDHHmmss +0000
 */
function parseXmltvTime(timeStr: string): Date | null {
	if (!timeStr) return null;

	// Remove whitespace
	const cleaned = timeStr.trim();

	// Extract date/time part and timezone
	const match = cleaned.match(/^(\d{14})(?:\s*([+-]\d{4}))?$/);
	if (!match) return null;

	const [, datetime, tz] = match;

	const year = parseInt(datetime.slice(0, 4), 10);
	const month = parseInt(datetime.slice(4, 6), 10) - 1; // JS months are 0-indexed
	const day = parseInt(datetime.slice(6, 8), 10);
	const hour = parseInt(datetime.slice(8, 10), 10);
	const minute = parseInt(datetime.slice(10, 12), 10);
	const second = parseInt(datetime.slice(12, 14), 10);

	// Create date in UTC
	let date = new Date(Date.UTC(year, month, day, hour, minute, second));

	// Apply timezone offset if present
	if (tz) {
		const tzSign = tz[0] === '+' ? -1 : 1;
		const tzHours = parseInt(tz.slice(1, 3), 10);
		const tzMinutes = parseInt(tz.slice(3, 5), 10);
		const offsetMs = tzSign * (tzHours * 60 + tzMinutes) * 60 * 1000;
		date = new Date(date.getTime() + offsetMs);
	}

	return isNaN(date.getTime()) ? null : date;
}

/**
 * Simple XML parser for XMLTV format.
 * Uses regex-based approach for the relatively simple XMLTV structure.
 */
class XmltvParser {
	/**
	 * Fetch and parse an XMLTV feed from a URL.
	 */
	async fetchAndParse(url: string): Promise<XmltvData> {
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'Cinephage/1.0',
				Accept: 'application/xml, text/xml, */*'
			}
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch XMLTV: ${response.status} ${response.statusText}`);
		}

		let content: string;
		const buffer = Buffer.from(await response.arrayBuffer());

		// Check if content is gzip compressed
		if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
			try {
				const decompressed = gunzipSync(buffer);
				content = decompressed.toString('utf-8');
			} catch (error) {
				throw new Error(
					`Failed to decompress gzip XMLTV: ${error instanceof Error ? error.message : 'Unknown error'}`
				);
			}
		} else {
			content = buffer.toString('utf-8');
		}

		return this.parse(content);
	}

	/**
	 * Parse XMLTV content string.
	 */
	parse(xmlContent: string): XmltvData {
		const channels: XmltvChannel[] = [];
		const programs: XmltvProgram[] = [];

		// Parse channels
		const channelRegex = /<channel\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/channel>/gi;
		let channelMatch;

		while ((channelMatch = channelRegex.exec(xmlContent)) !== null) {
			const [, id, content] = channelMatch;

			// Extract display name
			const displayNameMatch = content.match(/<display-name[^>]*>([^<]+)<\/display-name>/i);
			const displayName = displayNameMatch ? this.decodeXmlEntities(displayNameMatch[1]) : id;

			// Extract icon
			const iconMatch = content.match(/<icon\s+src="([^"]+)"/i);
			const icon = iconMatch ? iconMatch[1] : undefined;

			channels.push({ id, displayName, icon });
		}

		// Parse programs
		const programRegex =
			/<programme\s+start="([^"]+)"\s+stop="([^"]+)"\s+channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/gi;
		let programMatch;

		while ((programMatch = programRegex.exec(xmlContent)) !== null) {
			const [, startStr, stopStr, channel, content] = programMatch;

			const start = parseXmltvTime(startStr);
			const stop = parseXmltvTime(stopStr);

			if (!start || !stop) continue;

			// Extract title
			const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
			const title = titleMatch ? this.decodeXmlEntities(titleMatch[1]) : 'Unknown';

			// Extract description
			const descMatch = content.match(/<desc[^>]*>([^<]+)<\/desc>/i);
			const description = descMatch ? this.decodeXmlEntities(descMatch[1]) : undefined;

			// Extract category
			const categoryMatch = content.match(/<category[^>]*>([^<]+)<\/category>/i);
			const category = categoryMatch ? this.decodeXmlEntities(categoryMatch[1]) : undefined;

			// Extract icon
			const iconMatch = content.match(/<icon\s+src="([^"]+)"/i);
			const icon = iconMatch ? iconMatch[1] : undefined;

			// Extract rating
			const ratingMatch = content.match(/<rating[^>]*>[\s\S]*?<value>([^<]+)<\/value>/i);
			const rating = ratingMatch ? this.decodeXmlEntities(ratingMatch[1]) : undefined;

			// Extract episode number
			const episodeMatch = content.match(/<episode-num[^>]*>([^<]+)<\/episode-num>/i);
			const episodeNum = episodeMatch ? this.decodeXmlEntities(episodeMatch[1]) : undefined;

			programs.push({
				channel,
				start,
				stop,
				title,
				description,
				category,
				icon,
				rating,
				episodeNum
			});
		}

		logger.debug('[XmltvParser] Parsed XMLTV', {
			channels: channels.length,
			programs: programs.length
		});

		return { channels, programs };
	}

	/**
	 * Decode XML entities.
	 */
	private decodeXmlEntities(text: string): string {
		return text
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&apos;/g, "'")
			.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
			.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
	}
}

// Singleton instance
let instance: XmltvParser | null = null;

export function getXmltvParser(): XmltvParser {
	if (!instance) {
		instance = new XmltvParser();
	}
	return instance;
}

export type { XmltvParser };
