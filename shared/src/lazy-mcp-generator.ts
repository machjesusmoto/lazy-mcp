/**
 * Lazy-MCP Configuration Generator
 *
 * Generates lazy-mcp proxy configuration from Claude Code's MCP server setup.
 *
 * @see https://github.com/voicetreelab/lazy-mcp
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { MCPServer } from './types';

/**
 * Lazy-MCP proxy configuration structure
 */
export interface LazyMCPConfig {
  mcpProxy: {
    baseURL: string;
    addr: string;
    name: string;
    version: string;
    type: 'streamable-http' | 'sse';
    options: {
      lazyLoad?: boolean;
      logEnabled?: boolean;
      panicIfInvalid?: boolean;
      authTokens?: string[];
    };
  };
  mcpServers: Record<string, {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    options?: {
      toolFilter?: {
        mode: 'allow' | 'block';
        list: string[];
      };
      panicIfInvalid?: boolean;
      logEnabled?: boolean;
      authTokens?: string[];
    };
  }>;
}

/**
 * Lazy-MCP configuration generation options
 */
export interface LazyMCPGeneratorOptions {
  /** Base URL for the proxy server */
  baseURL?: string;
  /** Port to listen on */
  port?: number;
  /** Enable lazy loading */
  lazyLoad?: boolean;
  /** Enable debug logging */
  logEnabled?: boolean;
  /** Servers to include (default: all) */
  includeServers?: string[];
  /** Servers to exclude */
  excludeServers?: string[];
}

/**
 * Generates lazy-mcp configuration from Claude Code MCP servers
 */
export class LazyMCPGenerator {
  /**
   * Generate lazy-mcp configuration from MCP servers
   */
  generateConfig(
    mcpServers: MCPServer[],
    options: LazyMCPGeneratorOptions = {}
  ): LazyMCPConfig {
    const {
      baseURL = 'http://localhost:9090',
      port = 9090,
      lazyLoad = true,
      logEnabled = true,
      includeServers = [],
      excludeServers = []
    } = options;

    // Filter servers based on include/exclude lists
    const filteredServers = mcpServers.filter(server => {
      // Skip if explicitly excluded
      if (excludeServers.includes(server.name)) {
        return false;
      }

      // If include list provided, only include those
      if (includeServers.length > 0) {
        return includeServers.includes(server.name);
      }

      // Otherwise include all enabled servers
      return server.enabled;
    });

    // Build mcpServers object
    const mcpServersConfig: LazyMCPConfig['mcpServers'] = {};

    for (const server of filteredServers) {
      mcpServersConfig[server.name] = {
        command: server.command,
        args: server.args || [],
        env: server.env || {}
      };
    }

    // Build complete configuration
    const config: LazyMCPConfig = {
      mcpProxy: {
        baseURL,
        addr: `:${port}`,
        name: 'MCP Proxy with Lazy Loading',
        version: '1.0.0',
        type: 'streamable-http',
        options: {
          lazyLoad,
          logEnabled
        }
      },
      mcpServers: mcpServersConfig
    };

    return config;
  }

  /**
   * Write lazy-mcp configuration to file
   */
  async writeConfigFile(
    config: LazyMCPConfig,
    outputPath: string
  ): Promise<void> {
    const configJson = JSON.stringify(config, null, 2);
    await fs.writeFile(outputPath, configJson, 'utf-8');
  }

  /**
   * Generate and write lazy-mcp configuration
   */
  async generateConfigFile(
    mcpServers: MCPServer[],
    outputPath: string,
    options: LazyMCPGeneratorOptions = {}
  ): Promise<LazyMCPConfig> {
    const config = this.generateConfig(mcpServers, options);
    await this.writeConfigFile(config, outputPath);
    return config;
  }

  /**
   * Get default configuration path for lazy-mcp
   */
  getDefaultConfigPath(): string {
    return path.join(os.homedir(), '.config', 'lazy-mcp', 'config.json');
  }

  /**
   * Generate installation instructions
   */
  generateInstallInstructions(configPath: string, port: number): string {
    return `
# Lazy-MCP Installation Instructions

## 1. Install lazy-mcp

\`\`\`bash
# Clone repository
git clone https://github.com/voicetreelab/lazy-mcp.git
cd lazy-mcp

# Build
make build

# Or install globally
go install github.com/voicetreelab/lazy-mcp@latest
\`\`\`

## 2. Start lazy-mcp proxy

\`\`\`bash
# Using built binary
./build/mcp-proxy --config ${configPath}

# Or if installed globally
lazy-mcp --config ${configPath}
\`\`\`

## 3. Configure Claude Code to use proxy

Edit \`~/.claude.json\` and replace your MCP servers with a single proxy server:

\`\`\`json
{
  "mcpServers": {
    "lazy-mcp-proxy": {
      "url": "http://localhost:${port}/sse"
    }
  }
}
\`\`\`

## 4. Restart Claude Code

The proxy will lazy-load your MCP servers on-demand, reducing initial context by ~95%.

## Benefits

- **Token Reduction**: 95% less context usage (2 meta-tools instead of 100+ tools)
- **Faster Startup**: Servers load on-demand
- **Organized Discovery**: Hierarchical tool navigation
- **Same Functionality**: All tools still available when needed

## Verification

After starting Claude Code with the proxy:

1. List tools - should see only \`get_tools_in_category\` and \`execute_tool\`
2. Use \`get_tools_in_category("")\` to explore available servers
3. Execute tools normally - servers load automatically

## Troubleshooting

- **Port conflict**: Change \`addr\` in config to use different port
- **Server not starting**: Check paths in \`command\` and \`args\` fields
- **Connection failed**: Verify proxy is running on correct port
`.trim();
  }
}
