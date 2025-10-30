"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTextInTerm = runTextInTerm;
exports.restartRTerminal = restartRTerminal;
exports.chooseTerminal = chooseTerminal;
const vscode = require("vscode");
const positron = require("positron");
/**
 * Run text/code in the R terminal.
 * Sends code to the active R runtime via Positron's executeCode API.
 *
 * @param code The R code to execute
 * @param execute If true, execute the code; if false, just insert it into the console
 */
async function runTextInTerm(code, execute = true) {
    try {
        if (execute) {
            // Use Positron's executeCode API to run the code
            await positron.runtime.executeCode('r', code, true);
            console.info('[rTerminal] Code executed:', code);
        }
        else {
            console.info('[rTerminal] Code insertion not yet implemented, executing instead:', code);
            // For now, we execute; inserting without executing would require more UI integration
            await positron.runtime.executeCode('r', code, true);
        }
    }
    catch (error) {
        console.error('[rTerminal] Error executing code:', error);
        void vscode.window.showErrorMessage(`Failed to execute code in R console: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Restart the R terminal/runtime.
 */
async function restartRTerminal() {
    try {
        const sessions = await positron.runtime.getActiveSessions();
        const rSession = sessions.find((s) => s && s.runtimeMetadata.languageId === 'r');
        if (rSession) {
            await positron.runtime.restartSession(rSession.metadata.sessionId);
            console.info('[rTerminal] R session restarted');
        }
        else {
            console.warn('[rTerminal] No active R session to restart');
        }
    }
    catch (error) {
        console.error('[rTerminal] Error restarting R terminal:', error);
    }
}
/**
 * Choose or get the active terminal for R.
 * Returns the terminal object if available, or undefined.
 */
async function chooseTerminal() {
    const terminals = vscode.window.terminals.filter(t => t.name.toLowerCase().includes('r'));
    if (terminals.length === 0) {
        console.info('[rTerminal] No R terminals found');
        return undefined;
    }
    if (terminals.length === 1) {
        return terminals[0];
    }
    // If multiple R terminals, show a quick pick
    const chosen = await vscode.window.showQuickPick(terminals.map(t => ({ label: t.name, terminal: t })), { placeHolder: 'Choose R terminal' });
    return chosen?.terminal;
}
//# sourceMappingURL=rTerminal.js.map