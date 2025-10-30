"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const rstudioapi_1 = require("./rstudioapi");
const R_PIPE_SETTING = "positron.r.pipe";
const USE_NATIVE_PIPE_SETTING = "positron.r.useNativePipe";
let isChanging = false;
// Utility Functions
function getPipeString() {
    const config = vscode.workspace.getConfiguration();
    const pipe = config.get(R_PIPE_SETTING);
    if (pipe === "|>") {
        return "|>";
    }
    return "%>%";
}
function getUseNativeBoolean() {
    const config = vscode.workspace.getConfiguration();
    return config.get(USE_NATIVE_PIPE_SETTING, false);
}
async function setPipeString(value) {
    const config = vscode.workspace.getConfiguration();
    await config.update(R_PIPE_SETTING, value, vscode.ConfigurationTarget.Workspace);
}
async function setUseNativeBoolean(value) {
    const config = vscode.workspace.getConfiguration();
    await config.update(USE_NATIVE_PIPE_SETTING, value, vscode.ConfigurationTarget.Workspace);
}
async function syncStringFromBool() {
    if (isChanging)
        return;
    isChanging = true;
    const useNative = getUseNativeBoolean();
    const currentPipe = getPipeString();
    const newPipe = useNative ? "|>" : "%>%";
    if (currentPipe !== newPipe) {
        await setPipeString(newPipe);
        vscode.window.showInformationMessage(`R pipe set to ${useNative ? "baseR |>" : "magrittr %>%"} (workspace)`);
    }
    isChanging = false;
}
async function syncBoolFromString() {
    if (isChanging)
        return;
    isChanging = true;
    const pipe = getPipeString();
    const currentUseNative = getUseNativeBoolean();
    const newUseNative = pipe === "|>";
    if (currentUseNative !== newUseNative) {
        await setUseNativeBoolean(newUseNative);
    }
    isChanging = false;
}
async function formatPipesInDocument() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("No active editor found");
        return;
    }
    const document = editor.document;
    if (document.languageId !== "r") {
        vscode.window.showWarningMessage("This command only works with R files");
        return;
    }
    const targetPipe = getPipeString();
    const sourcePipe = targetPipe === "|>" ? "%>%" : "|>";
    const text = document.getText();
    // Check if there are any pipes to replace
    if (!text.includes(sourcePipe)) {
        vscode.window.showInformationMessage(`No ${sourcePipe} pipes found to replace`);
        return;
    }
    // Use regex to replace all occurrences of the source pipe
    // We need to escape special characters for regex
    const escapedSourcePipe = sourcePipe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedSourcePipe, "g");
    const newText = text.replace(regex, targetPipe);
    // Apply the edit
    const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, fullRange, newText);
    const success = await vscode.workspace.applyEdit(edit);
    if (success) {
        const count = (text.match(regex) || []).length;
        vscode.window.showInformationMessage(`Replaced ${count} occurrence(s) of ${sourcePipe} with ${targetPipe}`);
    }
    else {
        vscode.window.showErrorMessage("Failed to format pipes in document");
    }
}
function activate(context) {
    // Initial sync
    syncBoolFromString();
    // Register command
    const toggleCommand = vscode.commands.registerCommand("positron-r-pipe-toggle.toggle", async () => {
        const currentValue = getUseNativeBoolean();
        await setUseNativeBoolean(!currentValue);
        await syncStringFromBool();
    });
    // Register RStudio addin picker command
    const addinCommand = vscode.commands.registerCommand("r.launchAddinPicker", async () => {
        await (0, rstudioapi_1.launchAddinPicker)();
    });
    // Register format pipes command
    const formatPipesCommand = vscode.commands.registerCommand("positron-r-wizard.formatPipes", async () => {
        await formatPipesInDocument();
    });
    context.subscriptions.push(toggleCommand);
    context.subscriptions.push(addinCommand);
    context.subscriptions.push(formatPipesCommand);
    // Listen for configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration(USE_NATIVE_PIPE_SETTING)) {
            await syncStringFromBool();
        }
        else if (e.affectsConfiguration(R_PIPE_SETTING)) {
            await syncBoolFromString();
        }
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map