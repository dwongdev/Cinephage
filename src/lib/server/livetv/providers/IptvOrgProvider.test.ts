import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IptvOrgProvider } from './IptvOrgProvider';

// Mock getStreamingIndexerSettings to prevent DB calls in module init
vi.mock('$lib/server/streaming/settings', () => ({
	getStreamingIndexerSettings: vi.fn(async () => ({
		cinephageVersion: '1.0.0',
		cinephageCommit: 'abc123'
	}))
}));

describe('IptvOrgProvider', () => {
	let provider: IptvOrgProvider;

	// Instantiate fresh before each test block
	beforeEach(() => {
		provider = new IptvOrgProvider();
	});

	describe('parseIptvPlaylist', () => {
		it('should parse a valid M3U playlist with multiple channels', () => {
			const content = [
				'#EXTM3U',
				'#EXTINF:-1 tvg-id="iptv-org:ABC.us" tvg-name="ABC" tvg-logo="https://logo.png" group-title="General" tvg-resolution="720p" tvg-source="iptv-org" ,ABC',
				'https://example.com/stream.m3u8',
				'#EXTINF:-1 tvg-id="iptv-org:NBC.us" tvg-name="NBC" group-title="News" ,NBC News',
				'https://example.com/nbc.m3u8'
			].join('\n');

			// @ts-expect-error accessing private method for testing
			const entries = provider.parseIptvPlaylist(content);

			expect(entries).toHaveLength(2);

			expect(entries[0]).toEqual({
				channelId: 'iptv-org:ABC.us',
				name: 'ABC',
				logo: 'https://logo.png',
				groupTitle: 'General',
				resolution: '720p',
				sourceProvider: 'iptv-org',
				url: 'https://example.com/stream.m3u8'
			});

			expect(entries[1]).toEqual({
				channelId: 'iptv-org:NBC.us',
				name: 'NBC',
				logo: undefined,
				groupTitle: 'News',
				resolution: undefined,
				sourceProvider: undefined,
				url: 'https://example.com/nbc.m3u8'
			});
		});

		it('should skip entries without tvg-id', () => {
			const content = [
				'#EXTM3U',
				'#EXTINF:-1 tvg-name="Unknown" ,No ID',
				'https://example.com/no-id.m3u8'
			].join('\n');

			// @ts-expect-error accessing private method for testing
			const entries = provider.parseIptvPlaylist(content);

			expect(entries).toHaveLength(0);
		});

		it('should handle empty playlist (only #EXTM3U header)', () => {
			// @ts-expect-error accessing private method for testing
			const entries = provider.parseIptvPlaylist('#EXTM3U\n');

			expect(entries).toHaveLength(0);
		});

		it('should use EXTINF display name as fallback when tvg-name is missing', () => {
			const content = [
				'#EXTM3U',
				'#EXTINF:-1 tvg-id="test:channel" ,Channel Display Name',
				'https://example.com/stream.m3u8'
			].join('\n');

			// @ts-expect-error accessing private method for testing
			const entries = provider.parseIptvPlaylist(content);

			expect(entries).toHaveLength(1);
			expect(entries[0].name).toBe('Channel Display Name');
		});

		it('should handle entry with EXTINF spanning format that omits comma-separated name', () => {
			const content = [
				'#EXTM3U',
				'#EXTINF:-1 tvg-id="test:channel" tvg-name="Test" ,',
				'https://example.com/stream.m3u8'
			].join('\n');

			// @ts-expect-error accessing private method for testing
			const entries = provider.parseIptvPlaylist(content);

			expect(entries).toHaveLength(1);
			expect(entries[0].name).toBe('Test');
		});
	});

	describe('parseM3uAttributes', () => {
		it('should parse double-quoted key="value" pairs', () => {
			// @ts-expect-error accessing private method for testing
			const attrs = provider.parseM3uAttributes('tvg-id="abc" tvg-name="ABC" group-title="News"');
			expect(attrs).toEqual({
				'tvg-id': 'abc',
				'tvg-name': 'ABC',
				'group-title': 'News'
			});
		});

		it('should handle single-quoted values', () => {
			// @ts-expect-error accessing private method for testing
			const attrs = provider.parseM3uAttributes("tvg-id='abc' tvg-name='ABC'");
			expect(attrs).toEqual({
				'tvg-id': 'abc',
				'tvg-name': 'ABC'
			});
		});

		it('should handle unquoted values', () => {
			// @ts-expect-error accessing private method for testing
			const attrs = provider.parseM3uAttributes('resolution=720p codec=h264');
			expect(attrs).toEqual({
				resolution: '720p',
				codec: 'h264'
			});
		});

		it('should return empty object for empty string', () => {
			// @ts-expect-error accessing private method for testing
			const attrs = provider.parseM3uAttributes('');
			expect(attrs).toEqual({});
		});

		it('should lowercase all attribute keys', () => {
			// @ts-expect-error accessing private method for testing
			const attrs = provider.parseM3uAttributes('Tvg-Id="abc" TVG-NAME="ABC" GROUP-Title="News"');
			expect(attrs).toEqual({
				'tvg-id': 'abc',
				'tvg-name': 'ABC',
				'group-title': 'News'
			});
		});

		it('should handle mixed quote styles in one string', () => {
			// @ts-expect-error accessing private method for testing
			const attrs = provider.parseM3uAttributes('tvg-id="abc" tvg-name=\'ABC\' resolution=720p');
			expect(attrs).toEqual({
				'tvg-id': 'abc',
				'tvg-name': 'ABC',
				resolution: '720p'
			});
		});
	});

	describe('capabilities and metadata', () => {
		it('should report correct provider type', () => {
			expect(provider.type).toBe('iptvorg');
		});

		it('should report correct display name', () => {
			expect(provider.getDisplayName()).toBe('IPTV-Org (Free Channels)');
		});

		it('should support EPG', () => {
			expect(provider.hasEpgSupport()).toBe(true);
		});

		it('should not support archive', () => {
			expect(provider.supportsArchive()).toBe(false);
		});

		it('should have correct capabilities', () => {
			expect(provider.capabilities).toEqual({
				supportsEpg: true,
				supportsArchive: false,
				supportsCategories: true,
				requiresAuthentication: false,
				streamUrlExpires: false
			});
		});
	});
});
