export const commands = {
  'lazy:help': {
    execute: () => {
      return {
        message: `
lazy-mcp v2.0.0 - Intelligent lazy-loading for Claude Code MCP tools

Commands:
  /lazy:help      Show this help
  /lazy:version   Show version
  /lazy:status    Show current context status

Features:
  - Agent-driven tool loading based on usage patterns
  - Registry-informed tool recommendations
  - Automatic context optimization
  - Profile-based workflows
        `.trim()
      };
    }
  },

  'lazy:version': {
    execute: () => {
      return { message: 'lazy-mcp v2.0.0' };
    }
  },

  'lazy:status': {
    execute: async () => {
      // Stub - will be implemented in later phases
      return {
        message: 'Status: 0 MCP servers, 0 memories, 0 agents loaded'
      };
    }
  }
};
