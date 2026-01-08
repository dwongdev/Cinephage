/**
 * Stalker Portal Module
 *
 * Exports for Stalker/Ministra protocol IPTV integration.
 */

export { StalkerPortalClient, createStalkerClient } from './StalkerPortalClient';
export { StalkerAccountManager, getStalkerAccountManager } from './StalkerAccountManager';
export {
	StalkerChannelSyncService,
	getStalkerChannelSyncService
} from './StalkerChannelSyncService';
export { StalkerChannelService, getStalkerChannelService } from './StalkerChannelService';
export { StalkerPortalManager, getStalkerPortalManager } from './StalkerPortalManager';
export type {
	StalkerPortal,
	CreatePortalInput,
	UpdatePortalInput,
	PortalDetectionResult,
	PortalTestResult,
	PortalScanSummary
} from './StalkerPortalManager';
export { MacGenerator, MAC_PREFIXES } from './MacGenerator';
export type { MacPrefix } from './MacGenerator';
export { PortalScannerService, getPortalScannerService } from './PortalScannerService';
export type {
	ScanResult,
	ScanHistoryEntry,
	RandomScanOptions,
	SequentialScanOptions,
	ImportScanOptions
} from './PortalScannerService';
