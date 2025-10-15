/**
 * mcp-toggle Claude Code Plugin
 * Version: 2.0.0
 *
 * Main entry point for the plugin.
 */

import { sessionStartHook } from './hooks/session-start';
import { commands } from './commands';

export const PLUGIN_VERSION = '2.0.0';
export const PLUGIN_NAME = 'mcp-toggle';

// Export hooks
export const hooks = {
  SessionStart: sessionStartHook
};

// Export commands
export { commands };

// Plugin activation
export function activate() {
  // eslint-disable-next-line no-console
  console.log(`${PLUGIN_NAME} v${PLUGIN_VERSION} activated`);
  return {
    hooks,
    commands
  };
}

// Default export
export default {
  name: PLUGIN_NAME,
  version: PLUGIN_VERSION,
  activate,
  hooks,
  commands
};
