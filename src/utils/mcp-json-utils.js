"use strict";
/**
 * Utilities for reading, writing, and manipulating .mcp.json files.
 * Implements Phase 2 (Foundation) of the v2.0.0 architectural redesign.
 * Core utilities for atomic writes with backup/restore for zero-corruption guarantee.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.readMcpJson = readMcpJson;
exports.writeMcpJson = writeMcpJson;
exports.isBlockedServer = isBlockedServer;
exports.createDummyOverride = createDummyOverride;
exports.extractOriginalConfig = extractOriginalConfig;
exports.removeBlockingMetadata = removeBlockingMetadata;
exports.ensureClaudeDirectory = ensureClaudeDirectory;
exports.mcpJsonExists = mcpJsonExists;
exports.ensureMcpJson = ensureMcpJson;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
/**
 * Read .mcp.json from a directory.
 * Returns empty config if file doesn't exist.
 *
 * @param projectDir - Directory containing .mcp.json
 * @returns Parsed .mcp.json configuration
 * @throws Error if file exists but is malformed
 */
async function readMcpJson(projectDir) {
    const configPath = path.join(projectDir, '.mcp.json');
    if (!(await fs.pathExists(configPath))) {
        return { mcpServers: {} };
    }
    try {
        const content = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(content);
        // Ensure mcpServers object exists
        if (!config.mcpServers) {
            config.mcpServers = {};
        }
        return config;
    }
    catch (error) {
        throw new Error(`Failed to read .mcp.json from ${projectDir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Write .mcp.json to a directory atomically.
 * Creates backup before writing and restores on failure.
 *
 * @param projectDir - Directory to write .mcp.json to
 * @param config - Configuration to write
 * @throws Error if write fails
 */
async function writeMcpJson(projectDir, config) {
    const configPath = path.join(projectDir, '.mcp.json');
    const backupPath = `${configPath}.backup`;
    const tempPath = `${configPath}.tmp`;
    // Create backup if file exists
    if (await fs.pathExists(configPath)) {
        await fs.copy(configPath, backupPath);
    }
    try {
        // Write to temporary file first
        const content = JSON.stringify(config, null, 2) + '\n';
        await fs.writeFile(tempPath, content, 'utf-8');
        // Atomic move
        await fs.move(tempPath, configPath, { overwrite: true });
        await fs.chmod(configPath, 0o644);
        // Remove backup on success
        if (await fs.pathExists(backupPath)) {
            await fs.remove(backupPath);
        }
    }
    catch (error) {
        // Restore from backup on failure
        if (await fs.pathExists(backupPath)) {
            await fs.move(backupPath, configPath, { overwrite: true });
        }
        // Clean up temp file
        await fs.remove(tempPath).catch(() => { });
        throw new Error(`Failed to write .mcp.json to ${projectDir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Check if a server configuration has blocking metadata.
 *
 * @param config - Server configuration to check
 * @returns True if server is blocked by mcp-toggle
 */
function isBlockedServer(config) {
    return '_mcpToggleBlocked' in config && config._mcpToggleBlocked === true;
}
/**
 * Create a dummy override configuration for an inherited server.
 * This prevents the inherited server from loading by overriding it with
 * an echo command that does nothing.
 *
 * @param serverName - Name of the server to block
 * @param original - Original server configuration to preserve
 * @returns Blocked server configuration
 */
function createDummyOverride(serverName, original) {
    return {
        command: 'echo',
        args: [`[mcp-toggle] Server '${serverName}' is blocked`],
        _mcpToggleBlocked: true,
        _mcpToggleBlockedAt: new Date().toISOString(),
        _mcpToggleOriginal: { ...original },
    };
}
/**
 * Extract original configuration from a blocked server.
 *
 * @param blocked - Blocked server configuration
 * @returns Original server configuration
 * @throws Error if server is not blocked or has no original config
 */
function extractOriginalConfig(blocked) {
    if (!isBlockedServer(blocked)) {
        throw new Error('Server configuration is not blocked by mcp-toggle');
    }
    if (!blocked._mcpToggleOriginal) {
        throw new Error('Blocked server has no original configuration');
    }
    return { ...blocked._mcpToggleOriginal };
}
/**
 * Remove blocking metadata from a server configuration.
 * Returns the original configuration or the config as-is if not blocked.
 *
 * @param config - Server configuration (blocked or unblocked)
 * @returns Clean server configuration without blocking metadata
 */
function removeBlockingMetadata(config) {
    if (!isBlockedServer(config)) {
        return config;
    }
    return extractOriginalConfig(config);
}
/**
 * Ensure project directory has .claude directory structure.
 * Creates .claude/ if it doesn't exist.
 *
 * @param projectDir - Project directory
 */
async function ensureClaudeDirectory(projectDir) {
    const claudeDir = path.join(projectDir, '.claude');
    if (!(await fs.pathExists(claudeDir))) {
        await fs.mkdir(claudeDir, { mode: 0o755 });
    }
}
/**
 * Check if .mcp.json exists in a directory.
 *
 * @param projectDir - Directory to check
 * @returns True if .mcp.json exists
 */
async function mcpJsonExists(projectDir) {
    const configPath = path.join(projectDir, '.mcp.json');
    return fs.pathExists(configPath);
}
/**
 * Create a minimal .mcp.json if it doesn't exist.
 *
 * @param projectDir - Directory to create .mcp.json in
 */
async function ensureMcpJson(projectDir) {
    if (!(await mcpJsonExists(projectDir))) {
        await writeMcpJson(projectDir, { mcpServers: {} });
    }
}
//# sourceMappingURL=mcp-json-utils.js.map