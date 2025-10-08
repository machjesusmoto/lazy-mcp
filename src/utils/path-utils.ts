import * as path from 'path';
import * as os from 'os';

/**
 * Normalizes a file path to use forward slashes and resolve relative paths.
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, '/');
}

/**
 * Converts a path to an absolute path.
 */
export function toAbsolute(filePath: string, basePath?: string): string {
  if (path.isAbsolute(filePath)) {
    return normalizePath(filePath);
  }
  const base = basePath || process.cwd();
  return normalizePath(path.resolve(base, filePath));
}

/**
 * Gets the parent directory of a path.
 */
export function getParent(filePath: string): string {
  return normalizePath(path.dirname(filePath));
}

/**
 * Checks if a path is within another path (parent-child relationship).
 */
export function isWithin(childPath: string, parentPath: string): boolean {
  const rel = path.relative(parentPath, childPath);
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

/**
 * Gets the home directory path.
 */
export function getHomeDir(): string {
  return normalizePath(os.homedir());
}

/**
 * Walks up the directory tree from startDir to homeDir, yielding each directory.
 * @yields {string} Absolute path to each directory in hierarchy
 */
export function* walkHierarchy(startDir: string): Generator<string> {
  const home = getHomeDir();
  let current = toAbsolute(startDir);

  while (true) {
    yield current;

    if (current === home || current === '/') {
      break;
    }

    const parent = getParent(current);
    if (parent === current) {
      // Reached root
      break;
    }

    current = parent;
  }
}

/**
 * Calculates hierarchy level (directory distance) from current to target.
 * Returns -1 if target is not an ancestor of current.
 */
export function getHierarchyLevel(currentDir: string, targetDir: string): number {
  const current = toAbsolute(currentDir);
  const target = toAbsolute(targetDir);

  if (current === target) {
    return 0;
  }

  let level = 0;
  for (const dir of walkHierarchy(current)) {
    if (dir === target) {
      return level;
    }
    level++;
  }

  return -1;
}

/**
 * Determines if a path is local (in current directory) or inherited (in parent directory).
 */
export function getSourceType(
  currentDir: string,
  sourcePath: string
): 'local' | 'inherited' {
  const current = toAbsolute(currentDir);
  const source = toAbsolute(sourcePath);

  if (source.startsWith(current + '/') || source === current) {
    return 'local';
  }

  return 'inherited';
}

/**
 * Joins path segments and normalizes the result.
 */
export function joinPath(...segments: string[]): string {
  return normalizePath(path.join(...segments));
}

/**
 * Gets the basename (filename) of a path.
 */
export function getBasename(filePath: string): string {
  return path.basename(filePath);
}

/**
 * Gets the file extension of a path.
 */
export function getExtension(filePath: string): string {
  return path.extname(filePath);
}
