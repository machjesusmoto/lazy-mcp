/**
 * Represents an item that has been blocked via blocked.md.
 */
export interface BlockedItem {
  /** Unique identifier (MCP name or memory file relative path) */
  identifier: string;

  /** What kind of item is blocked */
  type: 'mcp' | 'memory';

  /** When this item was blocked */
  blockedAt: Date;

  /** Tool/user that created the block (default: "mcp-toggle") */
  blockedBy?: string;
}

/**
 * Validates a BlockedItem object.
 * @throws Error if validation fails
 */
export function validateBlockedItem(item: BlockedItem): void {
  if (!item.identifier || item.identifier.trim().length === 0) {
    throw new Error('BlockedItem.identifier must be non-empty string');
  }
  if (!(item.blockedAt instanceof Date) || isNaN(item.blockedAt.getTime())) {
    throw new Error('BlockedItem.blockedAt must be valid date');
  }
  if (item.type === 'memory' && !item.identifier.endsWith('.md')) {
    throw new Error('BlockedItem.identifier for type=memory should be a relative path ending in .md');
  }
}

/**
 * Serializes a BlockedItem to the blocked.md format.
 * Format: "mcp:{identifier}" or "memory:{identifier}"
 */
export function serializeBlockedItem(item: BlockedItem): string {
  return `${item.type}:${item.identifier}`;
}

/**
 * Parses a line from blocked.md into a BlockedItem.
 * Format: "mcp:{identifier}" or "memory:{identifier}"
 * @returns BlockedItem or null if line is invalid
 */
export function parseBlockedItem(line: string): BlockedItem | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }

  const mcpMatch = trimmed.match(/^mcp:(.+)$/);
  if (mcpMatch) {
    return {
      identifier: mcpMatch[1],
      type: 'mcp',
      blockedAt: new Date(),
      blockedBy: 'mcp-toggle',
    };
  }

  const memoryMatch = trimmed.match(/^memory:(.+)$/);
  if (memoryMatch) {
    return {
      identifier: memoryMatch[1],
      type: 'memory',
      blockedAt: new Date(),
      blockedBy: 'mcp-toggle',
    };
  }

  return null;
}
