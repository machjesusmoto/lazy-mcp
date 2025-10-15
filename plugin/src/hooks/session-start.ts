// Placeholder type until we have @claude-code/plugin-api
interface SessionStartContext {
  workingDirectory: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any;
}

export async function sessionStartHook(_context: SessionStartContext) {
  // Enumerate current context
  const { mcpServers, memories, agents } = await enumerateContext();

  // Log context summary
  // eslint-disable-next-line no-console
  console.log(`Session started: ${mcpServers.length} MCP servers, ${memories.length} memories, ${agents.length} agents`);

  return {
    status: 'success',
    summary: {
      mcpServers: mcpServers.length,
      memories: memories.length,
      agents: agents.length
    }
  };
}

async function enumerateContext() {
  // Stub implementation - will be completed in later phases
  return {
    mcpServers: [],
    memories: [],
    agents: []
  };
}
