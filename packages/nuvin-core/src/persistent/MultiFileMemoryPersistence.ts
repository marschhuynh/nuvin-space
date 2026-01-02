import type { MemoryPersistence, MemorySnapshot } from '../ports.js';

export interface MultiFileMemoryPersistenceOptions {
  directory: string;
  /** Converts a memory key to a filename. Default: `history.${key}.json` */
  getFilename?: (key: string) => string;
  /** Extracts the key from a filename. Default: extracts from `history.{key}.json` */
  getKeyFromFilename?: (filename: string) => string | null;
}

const DEFAULT_PREFIX = 'history.';
const DEFAULT_SUFFIX = '.json';

/**
 * Multi-file persistence adapter that stores each memory key in its own file.
 * Files are named using the pattern: history.{key}.json
 * Only keys starting with 'agent:' are persisted to separate files.
 */
export class MultiFileMemoryPersistence<T = unknown> implements MemoryPersistence<T> {
  private getFilename: (key: string) => string;
  private getKeyFromFilename: (filename: string) => string | null;

  constructor(private options: MultiFileMemoryPersistenceOptions) {
    this.getFilename =
      options.getFilename ?? ((key: string) => `${DEFAULT_PREFIX}${key}${DEFAULT_SUFFIX}`);

    this.getKeyFromFilename =
      options.getKeyFromFilename ??
      ((filename: string) => {
        if (filename.startsWith(DEFAULT_PREFIX) && filename.endsWith(DEFAULT_SUFFIX)) {
          const key = filename.slice(DEFAULT_PREFIX.length, -DEFAULT_SUFFIX.length);
          // Only return keys that look like agent keys
          if (key.startsWith('agent:')) {
            return key;
          }
        }
        return null;
      });
  }

  async load(): Promise<MemorySnapshot<T>> {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const snapshot: MemorySnapshot<T> = {};

    if (!fs.existsSync(this.options.directory)) {
      return snapshot;
    }

    try {
      const files = fs.readdirSync(this.options.directory);

      for (const file of files) {
        const key = this.getKeyFromFilename(file);
        if (key === null) continue;

        const filepath = path.join(this.options.directory, file);
        try {
          const text = fs.readFileSync(filepath, 'utf-8');
          const data = JSON.parse(text);
          if (Array.isArray(data)) {
            snapshot[key] = data;
          }
        } catch {
          console.warn(`Failed to load agent memory from ${filepath}`);
        }
      }
    } catch (err) {
      console.warn(`Failed to read directory ${this.options.directory}:`, err);
    }

    return snapshot;
  }

  async save(snapshot: MemorySnapshot<T>): Promise<void> {
    const fs = await import('node:fs');
    const path = await import('node:path');

    // Ensure directory exists
    if (!fs.existsSync(this.options.directory)) {
      fs.mkdirSync(this.options.directory, { recursive: true });
    }

    // Write each agent key to its own file
    for (const [key, items] of Object.entries(snapshot)) {
      // Only persist agent-prefixed keys to separate files
      if (!key.startsWith('agent:')) {
        continue;
      }

      const filename = this.getFilename(key);
      const filepath = path.join(this.options.directory, filename);

      try {
        fs.writeFileSync(filepath, JSON.stringify(items, null, 2), 'utf-8');
      } catch (err) {
        console.warn(`Failed to save agent memory to ${filepath}:`, err);
      }
    }
  }
}
