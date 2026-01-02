/**
 * Constants for IPTV proxy system
 */

// FFmpeg binary paths (configurable via environment)
export const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';

// Timeout settings (in microseconds for FFmpeg -timeout flag)
export const FFMPEG_CONNECT_TIMEOUT_US = 5_000_000; // 5 seconds
export const FFMPEG_READ_TIMEOUT_US = 30_000_000; // 30 seconds

// Content types
export const MPEGTS_CONTENT_TYPE = 'video/MP2T';
export const M3U_CONTENT_TYPE = 'application/x-mpegurl';
