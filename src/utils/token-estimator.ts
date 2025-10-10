/**
 * Token estimation utilities for Claude models
 *
 * Based on Anthropic's guidance:
 * - Approximately 1.33 tokens per word for English text
 * - Approximately 1 token per 4 characters
 * - JSON structure adds overhead for keys and syntax
 *
 * Note: This is an estimation only. For exact counts, use the Anthropic
 * count_tokens API endpoint with an API key.
 */

/**
 * Estimate token count for plain text
 * Uses the character-based heuristic: ~4 characters per token
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTextTokens(text: string): number {
  if (!text) return 0;

  // Use character-based estimation: ~4 chars per token
  const charCount = text.length;
  const tokenEstimate = Math.ceil(charCount / 4);

  return tokenEstimate;
}

/**
 * Estimate token count for JSON data
 * JSON has additional overhead for structure (keys, quotes, braces, etc.)
 *
 * @param obj - Object to estimate tokens for
 * @returns Estimated token count
 */
export function estimateJsonTokens(obj: unknown): number {
  if (!obj) return 0;

  // Convert to JSON string to get actual serialized size
  const jsonString = JSON.stringify(obj, null, 2);

  // JSON typically has ~20% more tokens due to structural overhead
  // Use ~3.5 characters per token for JSON
  const charCount = jsonString.length;
  const tokenEstimate = Math.ceil(charCount / 3.5);

  return tokenEstimate;
}

/**
 * Estimate token count for markdown content
 * Markdown has formatting overhead (headers, lists, links, etc.)
 *
 * @param markdown - Markdown text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateMarkdownTokens(markdown: string): number {
  if (!markdown) return 0;

  // Markdown formatting adds some overhead
  // Use slightly lower ratio: ~3.8 chars per token
  const charCount = markdown.length;
  const tokenEstimate = Math.ceil(charCount / 3.8);

  return tokenEstimate;
}

/**
 * Format token count for display
 * Shows with K suffix for thousands
 *
 * @param tokens - Token count to format
 * @returns Formatted string (e.g., "1.2K", "500")
 */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) {
    const k = tokens / 1000;
    return `${k.toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * Estimate total context size for multiple items
 *
 * @param items - Array of text/object items
 * @param itemType - Type of items ('text', 'json', 'markdown')
 * @returns Total estimated token count
 */
export function estimateTotalTokens(
  items: Array<string | unknown>,
  itemType: 'text' | 'json' | 'markdown' = 'text'
): number {
  if (!items || items.length === 0) return 0;

  let total = 0;

  for (const item of items) {
    if (itemType === 'json') {
      total += estimateJsonTokens(item);
    } else if (itemType === 'markdown') {
      total += estimateMarkdownTokens(item as string);
    } else {
      total += estimateTextTokens(item as string);
    }
  }

  return total;
}
