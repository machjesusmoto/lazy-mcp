/**
 * Basic usage example for @mcp-toggle/shared
 *
 * This example demonstrates how to use the shared library to:
 * 1. Load MCP servers, memories, and agents
 * 2. Build a complete context status
 * 3. Display summary statistics
 */

import {
  ProjectContextBuilder,
  ConfigLoader,
  MemoryLoader,
  AgentLoader,
  ContextStatus
} from '../src/index';

async function demonstrateBasicUsage() {
  console.log('=== MCP Toggle - Shared Library Demo ===\n');

  // Example 1: Using individual loaders
  console.log('1. Loading individual components:');
  const configLoader = new ConfigLoader();
  const memoryLoader = new MemoryLoader();
  const agentLoader = new AgentLoader();

  const servers = await configLoader.loadMCPServers();
  console.log(`   - MCP Servers found: ${servers.length}`);

  const memories = await memoryLoader.loadMemoryFiles();
  console.log(`   - Memory files found: ${memories.length}`);

  const agents = await agentLoader.loadAgents();
  console.log(`   - Agents available: ${agents.length}\n`);

  // Example 2: Using the context builder
  console.log('2. Building complete context status:');
  const builder = new ProjectContextBuilder();
  const status: ContextStatus = await builder.buildContextStatus();

  console.log(`   - Total MCP servers: ${status.mcpServers.length}`);
  console.log(`   - Total memories: ${status.memories.length}`);
  console.log(`   - Total agents: ${status.agents.length}`);
  console.log(`   - Total estimated tokens: ${status.totalTokens.toLocaleString()}\n`);

  // Example 3: Displaying enabled/disabled breakdown
  console.log('3. Context breakdown:');
  const enabledServers = status.mcpServers.filter(s => s.enabled).length;
  const disabledServers = status.mcpServers.length - enabledServers;
  console.log(`   MCP Servers: ${enabledServers} enabled, ${disabledServers} disabled`);

  const enabledMemories = status.memories.filter(m => m.enabled).length;
  const disabledMemories = status.memories.length - enabledMemories;
  console.log(`   Memories: ${enabledMemories} enabled, ${disabledMemories} disabled`);

  const enabledAgents = status.agents.filter(a => a.enabled).length;
  const disabledAgents = status.agents.length - enabledAgents;
  console.log(`   Agents: ${enabledAgents} enabled, ${disabledAgents} disabled\n`);

  // Example 4: Using summary statistics
  console.log('4. Summary statistics:');
  const stats = builder.getSummaryStats(status);
  console.log(`   - Total items: ${stats.totalItems}`);
  console.log(`   - Enabled items: ${stats.enabledItems}`);
  console.log(`   - Disabled items: ${stats.disabledItems}`);
  console.log(`   - Enabled percentage: ${stats.enabledPercentage.toFixed(1)}%\n`);

  // Example 5: Listing MCP servers with token estimates
  if (status.mcpServers.length > 0) {
    console.log('5. MCP Server details:');
    status.mcpServers.forEach(server => {
      const statusIcon = server.enabled ? '✓' : '✗';
      console.log(`   ${statusIcon} ${server.name}: ${server.estimatedTokens.toLocaleString()} tokens`);
    });
    console.log();
  }

  // Example 6: Listing memory files
  if (status.memories.length > 0) {
    console.log('6. Memory files:');
    status.memories.slice(0, 5).forEach(memory => {
      const statusIcon = memory.enabled ? '✓' : '✗';
      const sizeKB = (memory.size / 1024).toFixed(1);
      console.log(`   ${statusIcon} ${memory.name} (${sizeKB}KB, ~${memory.estimatedTokens} tokens)`);
    });
    if (status.memories.length > 5) {
      console.log(`   ... and ${status.memories.length - 5} more`);
    }
    console.log();
  }

  // Example 7: Agent types
  console.log('7. Available agent types:');
  const agentTypes = new Set(status.agents.map(a => a.type));
  agentTypes.forEach(type => {
    const count = status.agents.filter(a => a.type === type).length;
    console.log(`   - ${type}: ${count} agent(s)`);
  });
  console.log();

  console.log('Demo complete!');
}

// Run the demo
demonstrateBasicUsage().catch(error => {
  console.error('Error running demo:', error);
  process.exit(1);
});
