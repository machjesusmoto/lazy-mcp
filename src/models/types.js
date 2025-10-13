"use strict";
/**
 * Core type definitions for v2.0.0 .mcp.json blocking mechanism.
 * These types represent the actual .mcp.json file structure and blocking metadata.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIGRATION_VALIDATION = void 0;
exports.isBlockedServer = isBlockedServer;
exports.validateMcpJsonConfig = validateMcpJsonConfig;
exports.validateMCPServerConfig = validateMCPServerConfig;
exports.validateBlockedMCPServerConfig = validateBlockedMCPServerConfig;
exports.isValidServerName = isValidServerName;
exports.validateMigrationOperation = validateMigrationOperation;
/**
 * Type guard to check if a server configuration has blocking metadata.
 */
function isBlockedServer(config) {
    return '_mcpToggleBlocked' in config && config._mcpToggleBlocked === true;
}
/**
 * Validates a McpJsonConfig object.
 * @throws Error if validation fails
 */
function validateMcpJsonConfig(config) {
    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
        throw new Error('McpJsonConfig.mcpServers must be an object');
    }
    // Validate each server config
    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
        if (!name || name.trim().length === 0) {
            throw new Error('Server name must be non-empty string');
        }
        validateMCPServerConfig(serverConfig);
    }
}
/**
 * Validates an MCPServerConfig object.
 * @throws Error if validation fails
 */
function validateMCPServerConfig(config) {
    if (!config.command || typeof config.command !== 'string' || config.command.trim().length === 0) {
        throw new Error('MCPServerConfig.command must be non-empty string');
    }
    if (config.args !== undefined) {
        if (!Array.isArray(config.args)) {
            throw new Error('MCPServerConfig.args must be array of strings');
        }
        if (config.args.some((arg) => typeof arg !== 'string')) {
            throw new Error('MCPServerConfig.args must contain only strings');
        }
    }
    if (config.env !== undefined) {
        if (typeof config.env !== 'object' || config.env === null) {
            throw new Error('MCPServerConfig.env must be object');
        }
        for (const [key, value] of Object.entries(config.env)) {
            if (typeof key !== 'string' || typeof value !== 'string') {
                throw new Error('MCPServerConfig.env must be string-to-string dictionary');
            }
        }
    }
}
/**
 * Validates a BlockedMCPServerConfig object.
 * @throws Error if validation fails
 */
function validateBlockedMCPServerConfig(config) {
    // First validate as regular server config
    validateMCPServerConfig(config);
    if (config.command !== 'echo') {
        throw new Error('BlockedMCPServerConfig.command must be "echo"');
    }
    if (!config._mcpToggleBlocked || config._mcpToggleBlocked !== true) {
        throw new Error('BlockedMCPServerConfig._mcpToggleBlocked must be exactly true');
    }
    if (!config._mcpToggleBlockedAt || typeof config._mcpToggleBlockedAt !== 'string') {
        throw new Error('BlockedMCPServerConfig._mcpToggleBlockedAt must be ISO 8601 timestamp string');
    }
    // Validate timestamp is valid ISO 8601
    const timestamp = new Date(config._mcpToggleBlockedAt);
    if (isNaN(timestamp.getTime())) {
        throw new Error('BlockedMCPServerConfig._mcpToggleBlockedAt must be valid ISO 8601 timestamp');
    }
    if (!config._mcpToggleOriginal || typeof config._mcpToggleOriginal !== 'object') {
        throw new Error('BlockedMCPServerConfig._mcpToggleOriginal must be valid MCPServerConfig');
    }
    // Validate original config
    validateMCPServerConfig(config._mcpToggleOriginal);
}
/**
 * Migration operation validation rules
 */
exports.MIGRATION_VALIDATION = {
    /** Minimum servers required for migration */
    MIN_SERVERS: 1,
    /** Maximum servers supported in UI */
    MAX_SERVERS: 50,
    /** Server name pattern (alphanumeric, hyphens, underscores) */
    SERVER_NAME_PATTERN: /^[a-zA-Z0-9_-]+$/,
    /** Maximum length for server name */
    MAX_NAME_LENGTH: 64,
    /** Required hierarchy level for migration (project-local) */
    REQUIRED_HIERARCHY_LEVEL: 1,
    /** Backup file retention period (milliseconds) */
    BACKUP_RETENTION_MS: 24 * 60 * 60 * 1000, // 24 hours
};
/**
 * Validate server name format
 *
 * @param name - Server name to validate
 * @returns true if valid, false otherwise
 */
function isValidServerName(name) {
    return (name.length > 0 &&
        name.length <= exports.MIGRATION_VALIDATION.MAX_NAME_LENGTH &&
        exports.MIGRATION_VALIDATION.SERVER_NAME_PATTERN.test(name));
}
/**
 * Validate migration operation readiness
 *
 * @param operation - Migration operation to validate
 * @returns Validation result with errors (if any)
 */
function validateMigrationOperation(operation) {
    const errors = [];
    // Validate server count
    if (operation.selectedServers.length < exports.MIGRATION_VALIDATION.MIN_SERVERS) {
        errors.push(`Must select at least ${exports.MIGRATION_VALIDATION.MIN_SERVERS} server(s)`);
    }
    if (operation.selectedServers.length > exports.MIGRATION_VALIDATION.MAX_SERVERS) {
        errors.push(`Cannot migrate more than ${exports.MIGRATION_VALIDATION.MAX_SERVERS} servers`);
    }
    // Validate all selected servers are project-local (hierarchyLevel === 1)
    const invalidServers = operation.selectedServers.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic server structure from TUI
    (server) => server.hierarchyLevel !== exports.MIGRATION_VALIDATION.REQUIRED_HIERARCHY_LEVEL);
    if (invalidServers.length > 0) {
        errors.push(`All servers must be project-local (hierarchyLevel === 1)`);
    }
    // Validate conflict resolutions if any conflicts exist
    if (operation.conflicts.length > 0) {
        for (const conflict of operation.conflicts) {
            // Validate resolution type
            if (!['skip', 'overwrite', 'rename'].includes(conflict.resolution)) {
                errors.push(`Invalid resolution type for ${conflict.serverName}: ${conflict.resolution}`);
            }
            // Validate rename has newName
            if (conflict.resolution === 'rename') {
                if (!conflict.newName) {
                    errors.push(`Rename resolution for ${conflict.serverName} requires newName`);
                }
                else if (!isValidServerName(conflict.newName)) {
                    errors.push(`Invalid newName for ${conflict.serverName}: ${conflict.newName}`);
                }
            }
        }
    }
    return { valid: errors.length === 0, errors };
}
//# sourceMappingURL=types.js.map