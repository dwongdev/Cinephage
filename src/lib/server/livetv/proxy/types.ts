/**
 * Types for IPTV proxy system
 */

import type { ChildProcess } from 'child_process';

export interface FFmpegStreamOptions {
	streamUrl: string;
	timeout?: number; // microseconds
	headers?: Record<string, string>; // HTTP headers to send
}

export interface ActiveStream {
	key: string;
	accountId: string;
	channelId: string;
	channelName: string;
	clientIp: string;
	startedAt: Date;
	process: ChildProcess;
}

export interface PlaylistOptions {
	baseUrl: string;
	includeGroupTitles?: boolean;
	includeChannelNumbers?: boolean;
	includeLogo?: boolean;
}
