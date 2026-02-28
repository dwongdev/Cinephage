import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { RootFolderService } from '$lib/server/downloadClients/RootFolderService.js';

const COMMON_BASE_PATHS = ['/mnt', '/media', '/srv', '/data', '/storage', '/home', '/opt', '/vol'];

function isPathWithinScope(pathToCheck: string, scopePath: string): boolean {
	const normalizedPath = resolve(pathToCheck);
	const normalizedScope = resolve(scopePath);
	if (normalizedPath === normalizedScope) {
		return true;
	}
	if (normalizedScope === '/') {
		return normalizedPath.startsWith('/');
	}
	return normalizedPath.startsWith(normalizedScope + '/');
}

async function getRootFolderPaths(): Promise<string[]> {
	const rootFolderService = new RootFolderService();
	const rootFolders = await rootFolderService.getFolders();
	return rootFolders.map((folder) => resolve(folder.path));
}

export async function isPathInsideManagedRoot(requestedPath: string): Promise<boolean> {
	const normalizedPath = resolve(requestedPath);
	const rootFolderPaths = await getRootFolderPaths();
	return rootFolderPaths.some((rootPath) => isPathWithinScope(normalizedPath, rootPath));
}

export async function isManagedRootPath(requestedPath: string): Promise<boolean> {
	const normalizedPath = resolve(requestedPath);
	const rootFolderPaths = await getRootFolderPaths();
	return rootFolderPaths.some((rootPath) => rootPath === normalizedPath);
}

/**
 * Validate a filesystem path is within allowed boundaries.
 *
 * Allowed:
 * - User home directory
 * - Configured root folders
 * - Common mount base paths
 */
export async function isPathAllowed(requestedPath: string): Promise<boolean> {
	const normalizedPath = resolve(requestedPath);
	const homeDir = homedir();

	if (isPathWithinScope(normalizedPath, homeDir) || isPathWithinScope(homeDir, normalizedPath)) {
		return true;
	}

	const rootFolderPaths = await getRootFolderPaths();

	for (const normalizedRootPath of rootFolderPaths) {
		if (
			isPathWithinScope(normalizedPath, normalizedRootPath) ||
			isPathWithinScope(normalizedRootPath, normalizedPath)
		) {
			return true;
		}
	}

	for (const basePath of COMMON_BASE_PATHS) {
		if (
			isPathWithinScope(normalizedPath, basePath) ||
			isPathWithinScope(basePath, normalizedPath)
		) {
			return true;
		}
	}

	return false;
}
