/**
 * Safe JSON parsing with error handling.
 */

/**
 * Result of a JSON parse operation.
 */
export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Parses JSON content with error handling.
 * Returns a result object instead of throwing errors.
 */
export function parseJSON<T = unknown>(content: string): ParseResult<T> {
  try {
    const data = JSON.parse(content) as T;
    return { success: true, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `JSON parse error: ${message}` };
  }
}

/**
 * Parses JSON content and validates it against a schema validator function.
 * @param content JSON string to parse
 * @param validator Function that returns true if the parsed object is valid
 * @param errorMessage Custom error message if validation fails
 */
export function parseAndValidate<T>(
  content: string,
  validator: (data: unknown) => data is T,
  errorMessage = 'Validation failed'
): ParseResult<T> {
  const result = parseJSON<unknown>(content);

  if (!result.success) {
    return result as ParseResult<T>;
  }

  if (!validator(result.data)) {
    return { success: false, error: errorMessage };
  }

  return { success: true, data: result.data as T };
}

/**
 * Safely stringifies an object to JSON.
 * Returns a result object instead of throwing errors.
 */
export function stringifyJSON<T>(
  data: T,
  pretty = false
): ParseResult<string> {
  try {
    const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    return { success: true, data: json };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `JSON stringify error: ${message}` };
  }
}

/**
 * Checks if a value is a plain object (not null, array, or other type).
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Safely reads and parses a JSON file.
 * Returns the parsed data or null if file doesn't exist or has invalid JSON.
 */
export async function safeReadJSON(
  filePath: string
): Promise<Record<string, unknown> | null> {
  try {
    const fs = await import('fs-extra');
    if (!(await fs.pathExists(filePath))) {
      return null;
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const result = parseJSON<Record<string, unknown>>(content);

    if (!result.success) {
      return null;
    }

    return result.data || null;
  } catch {
    return null;
  }
}
