/**
 * Represents a source of configuration (a .claude.json file or .claude directory).
 */
export interface ConfigSource {
  /** Absolute path to .claude.json or .claude directory */
  path: string;

  /** What this source provides */
  type: 'mcp' | 'memory';

  /** Relationship to current directory */
  sourceType: 'local' | 'inherited';

  /** Directory levels from current (0 = current, 1 = parent, etc.) */
  hierarchyLevel: number;

  /** Whether the file/directory currently exists */
  exists: boolean;

  /** Whether user has read permission */
  isReadable: boolean;

  /** Last modification time if exists */
  lastModified?: Date;
}

/**
 * Validates a ConfigSource object.
 * @throws Error if validation fails
 */
export function validateConfigSource(source: ConfigSource): void {
  if (!source.path || !source.path.startsWith('/')) {
    throw new Error('ConfigSource.path must be absolute path');
  }
  if (source.hierarchyLevel < 0) {
    throw new Error('ConfigSource.hierarchyLevel must be >= 0');
  }
  if (!source.exists && source.isReadable) {
    throw new Error('ConfigSource.isReadable should be false when exists = false');
  }
  if (source.exists && !source.lastModified) {
    throw new Error('ConfigSource.lastModified should be set when exists = true');
  }
}
