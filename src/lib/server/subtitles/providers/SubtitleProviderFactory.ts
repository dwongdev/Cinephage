/**
 * Subtitle Provider Factory
 *
 * Creates provider instances from configuration.
 * Uses the dynamic provider registry for all operations.
 */

import type { ISubtitleProvider, ISubtitleProviderFactory, ProviderDefinition } from './interfaces';
import type { SubtitleProviderConfig, ProviderImplementation } from '../types';
import { providerRegistry, ensureProvidersRegistered, type ProviderConstructor } from './registry';

/**
 * Factory for creating subtitle provider instances
 *
 * This factory delegates to the provider registry for all operations,
 * providing a clean interface for the rest of the application.
 */
export class SubtitleProviderFactory implements ISubtitleProviderFactory {
	private initialized = false;

	/**
	 * Ensure the registry is initialized before use
	 */
	private async ensureInitialized(): Promise<void> {
		if (!this.initialized) {
			await ensureProvidersRegistered();
			this.initialized = true;
		}
	}

	/**
	 * Create a provider instance from configuration
	 */
	createProvider(config: SubtitleProviderConfig): ISubtitleProvider {
		// Registry must be initialized before creating providers
		// This is sync because providers are created in sync contexts
		return providerRegistry.createProvider(config);
	}

	/**
	 * Check if factory can handle this implementation type
	 */
	canHandle(implementation: string): boolean {
		return providerRegistry.has(implementation);
	}

	/**
	 * Get list of supported implementation types
	 */
	getSupportedImplementations(): string[] {
		return providerRegistry.getImplementations();
	}

	/**
	 * Get all provider definitions with metadata
	 */
	getDefinitions(): ProviderDefinition[] {
		return providerRegistry.getAllDefinitions();
	}

	/**
	 * Get a specific provider definition
	 */
	getDefinition(implementation: string): ProviderDefinition | undefined {
		return providerRegistry.getDefinition(implementation);
	}

	/**
	 * Register a new provider type (for extensibility)
	 */
	registerProvider(
		implementation: ProviderImplementation,
		ProviderClass: ProviderConstructor,
		definition: ProviderDefinition
	): void {
		providerRegistry.register({
			implementation,
			providerClass: ProviderClass,
			definition
		});
	}
}

/** Singleton factory instance */
let factoryInstance: SubtitleProviderFactory | null = null;

/**
 * Get the singleton factory instance
 */
export function getSubtitleProviderFactory(): SubtitleProviderFactory {
	if (!factoryInstance) {
		factoryInstance = new SubtitleProviderFactory();
	}
	return factoryInstance;
}

/**
 * Initialize the factory (call during app startup)
 */
export async function initializeProviderFactory(): Promise<SubtitleProviderFactory> {
	await ensureProvidersRegistered();
	return getSubtitleProviderFactory();
}
