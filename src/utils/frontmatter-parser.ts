/**
 * Frontmatter parser utility for agent files
 * Feature: 003-add-migrate-to
 * Task: T008
 *
 * Parses YAML frontmatter from markdown files.
 */

import * as yaml from 'js-yaml';

/**
 * Parse frontmatter from markdown content
 *
 * Frontmatter must:
 * - Start at the beginning of the file with '---'
 * - End with '---'
 * - Contain valid YAML
 *
 * @param content - Markdown file content
 * @returns Parsed frontmatter object or undefined if no frontmatter found
 */
export function parseFrontmatter(content: string): { frontmatter: any; body: string } | null {
  // Check if content starts with frontmatter delimiter
  if (!content.trimStart().startsWith('---')) {
    return null;
  }

  // Split content by lines
  const lines = content.split('\n');

  // First line should be '---'
  if (lines[0].trim() !== '---') {
    return null;
  }

  // Find the closing '---'
  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }

  // No closing delimiter found
  if (endIndex === -1) {
    return null;
  }

  // Extract YAML content between delimiters
  const yamlContent = lines.slice(1, endIndex).join('\n');

  // Extract body content after frontmatter
  const body = lines.slice(endIndex + 1).join('\n');

  // Parse YAML with lenient options
  try {
    const frontmatter = yaml.load(yamlContent, {
      // Allow non-standard YAML features for compatibility
      json: true,
      // Don't throw on duplicate keys, use last value
      onWarning: () => {}, // Suppress warnings
    });

    // Handle empty frontmatter
    if (frontmatter === null || frontmatter === undefined) {
      return { frontmatter: {}, body };
    }

    // Ensure frontmatter is an object
    if (typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
      return null;
    }

    return { frontmatter, body };
  } catch (error) {
    // If YAML parsing fails, try manual key-value extraction for simple cases
    const manualParsed = parseSimpleFrontmatter(yamlContent);
    if (manualParsed) {
      return { frontmatter: manualParsed, body };
    }

    // Invalid YAML - return null
    return null;
  }
}

/**
 * Fallback parser for simple frontmatter that doesn't conform to strict YAML
 *
 * Handles basic key: value pairs where values may span multiple lines
 * until the next key or end of frontmatter.
 *
 * @param yamlContent - YAML content between delimiters
 * @returns Parsed object or null if parsing fails
 */
function parseSimpleFrontmatter(yamlContent: string): Record<string, any> | null {
  const lines = yamlContent.split('\n');
  const result: Record<string, any> = {};
  let currentKey: string | null = null;
  let currentValue: string[] = [];

  const flushCurrent = () => {
    if (currentKey) {
      const value = currentValue.join('\n').trim();
      result[currentKey] = value;
      currentKey = null;
      currentValue = [];
    }
  };

  for (const line of lines) {
    // Check if this is a key: value line
    const keyMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);

    if (keyMatch) {
      // Flush previous key if any
      flushCurrent();

      // Start new key
      currentKey = keyMatch[1];
      const initialValue = keyMatch[2];

      if (initialValue) {
        currentValue.push(initialValue);
      }
    } else if (currentKey) {
      // Continuation of current value
      currentValue.push(line);
    }
  }

  // Flush last key
  flushCurrent();

  // Return null if no keys were found
  return Object.keys(result).length > 0 ? result : null;
}
