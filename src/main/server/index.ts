import { createNeovateServer } from './create';
import type { NeovatePlugin, ServerInstance } from './types';

/**
 * Singleton manager for the Neovate server instance
 * Ensures only one server instance exists and handles concurrent creation attempts
 */
class NeovateServerManager {
  private instance: ServerInstance | null = null;
  private creationPromise: Promise<ServerInstance> | null = null;
  private plugins?: NeovatePlugin[];

  /**
   * Set plugins to be used when creating the server
   * Must be called before getOrCreate() to take effect
   */
  setPlugins(plugins?: NeovatePlugin[]): void {
    this.plugins = plugins;
  }

  /**
   * Get or create the Neovate server instance
   * Thread-safe - handles concurrent calls gracefully by reusing in-flight promises
   */
  async getOrCreate(): Promise<ServerInstance> {
    // Return existing instance
    if (this.instance) {
      return this.instance;
    }

    // Wait for in-progress creation
    if (this.creationPromise) {
      return this.creationPromise;
    }

    // Start new creation
    this.creationPromise = createNeovateServer(this.plugins)
      .then((instance) => {
        this.instance = instance;
        this.creationPromise = null;
        return instance;
      })
      .catch((error) => {
        // Clear promise so retry can work
        this.creationPromise = null;
        throw error;
      });

    return this.creationPromise;
  }

  /**
   * Stop the server and reset state
   * Safe to call multiple times
   */
  stop(): void {
    this.instance?.close();
    this.instance = null;
    this.creationPromise = null;
  }
}

/**
 * Singleton instance - use neovateServerManager.getOrCreate() to get/create server
 */
export const neovateServerManager = new NeovateServerManager();
