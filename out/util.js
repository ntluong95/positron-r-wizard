"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = config;
exports.showMessage = showMessage;
const vscode = require("vscode");
/**
 * Get the extension configuration object.
 * Returns the "positron-r-wizard" workspace configuration.
 */
function config() {
    return vscode.workspace.getConfiguration('positron-r-wizard');
}
/**
 * Show a message in VS Code.
 */
function showMessage(message, type = 'info') {
    switch (type) {
        case 'info':
            void vscode.window.showInformationMessage(message);
            break;
        case 'warn':
            void vscode.window.showWarningMessage(message);
            break;
        case 'error':
            void vscode.window.showErrorMessage(message);
            break;
    }
}
//# sourceMappingURL=util.js.map