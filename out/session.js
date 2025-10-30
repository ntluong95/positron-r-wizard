"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionDir = void 0;
exports.isRSessionActive = isRSessionActive;
exports.sessionDirectoryExists = sessionDirectoryExists;
exports.writeResponse = writeResponse;
exports.writeSuccessResponse = writeSuccessResponse;
const path = require("path");
const positron = require("positron");
const os_1 = require("os");
/**
 * The session directory path where Positron stores session metadata.
 * Typically used for addin registry and R session state.
 */
exports.sessionDir = path.join((0, os_1.homedir)(), '.positron', 'r-sessions');
/**
 * Check if a Positron R session is active.
 * Uses Positron's runtime API to detect active sessions.
 */
async function isRSessionActive() {
    try {
        const sessions = await positron.runtime.getActiveSessions();
        // Look for any R session
        return sessions.some((s) => s && s.runtimeMetadata.languageId === 'r');
    }
    catch {
        return false;
    }
}
/**
 * Check if the session directory exists.
 * This is a lightweight check to determine if an active R session is configured.
 */
function sessionDirectoryExists() {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs');
        return fs.existsSync(exports.sessionDir);
    }
    catch {
        return false;
    }
}
/**
 * Write a response object to the session directory (used for IPC with R backend).
 * This is a placeholder for session communication.
 */
async function writeResponse(obj, sd) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const fs = require('fs-extra');
        await fs.writeJSON(path.join(sd, 'response.json'), obj);
    }
    catch (error) {
        console.error('[session] writeResponse error:', error);
    }
}
/**
 * Write a success response to the session directory.
 */
async function writeSuccessResponse(sd) {
    await writeResponse({ success: true }, sd);
}
//# sourceMappingURL=session.js.map