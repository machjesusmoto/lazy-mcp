#!/usr/bin/env node
/**
 * CLI entry point for MCP Toggle.
 * Launches the TUI application to enumerate and manage MCP servers and memory files.
 */

import React from 'react';
import { render } from 'ink';
import { App } from './tui/app';
import { ErrorBoundary } from './tui/components/error-boundary';

// Error exit codes
const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  INVALID_ARGS: 2,
  PERMISSION_DENIED: 3,
  DISK_FULL: 28, // ENOSPC
};

/**
 * Display user-friendly error message and exit with appropriate code.
 */
function handleError(error: unknown): never {
  const err = error instanceof Error ? error : new Error(String(error));

  console.error('\n❌ Error:', err.message);

  // Determine exit code based on error type
  let exitCode = EXIT_CODES.GENERAL_ERROR;

  if (err.message.includes('EACCES') || err.message.includes('permission denied')) {
    exitCode = EXIT_CODES.PERMISSION_DENIED;
    console.error('\n💡 Recovery: Check that you have write permission to the project directory.');
    console.error('   Try running: chmod u+w .claude/');
  } else if (err.message.includes('ENOSPC') || err.message.includes('disk full')) {
    exitCode = EXIT_CODES.DISK_FULL;
    console.error('\n💡 Recovery: Free up disk space and try again.');
  } else if (err.message.includes('ENOENT') || err.message.includes('not found')) {
    console.error('\n💡 Recovery: Verify the project directory exists and is accessible.');
  } else {
    console.error('\n💡 Recovery: Check the error message above for details.');
  }

  console.error('');
  process.exit(exitCode);
}

// Set up error handlers
process.on('uncaughtException', handleError);
process.on('unhandledRejection', handleError);

// Parse command line args
const args = process.argv.slice(2);
let projectDir = process.cwd();
let noClaudeMdUpdate = false;

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--no-claude-md' || arg === '--no-claude-md-update') {
    noClaudeMdUpdate = true;
  } else if (arg.startsWith('--')) {
    console.error(`❌ Error: Unknown flag: ${arg}`);
    console.error('\nUsage: mcp-toggle [project-directory] [--no-claude-md]');
    console.error('\nExamples:');
    console.error('  mcp-toggle                      # Use current directory');
    console.error('  mcp-toggle ~/my-project         # Use specified directory');
    console.error('  mcp-toggle --no-claude-md       # Disable claude.md updates');
    console.error('  mcp-toggle ~/project --no-claude-md');
    process.exit(EXIT_CODES.INVALID_ARGS);
  } else {
    // First non-flag argument is the project directory
    projectDir = arg;
  }
}

// Render the TUI app wrapped in error boundary
try {
  const app = React.createElement(App, { projectDir, noClaudeMdUpdate });
  const wrappedApp = React.createElement(ErrorBoundary, null, app);
  const { waitUntilExit } = render(wrappedApp);

  // Wait for app to exit gracefully
  waitUntilExit().catch(handleError);
} catch (error) {
  handleError(error);
}
