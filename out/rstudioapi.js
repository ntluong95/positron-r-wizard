"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAddinPickerItems = getAddinPickerItems;
exports.purgeAddinPickerItems = purgeAddinPickerItems;
exports.launchAddinPicker = launchAddinPicker;
exports.sendCodeToRTerminal = sendCodeToRTerminal;
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
const vscode_1 = require("vscode");
const positron = require("positron");
const path = require("path");
const fs = require("fs");
const os = require("os");
// Helper functions
async function isRSessionActive() {
    try {
        const sessions = await positron.runtime.getActiveSessions();
        return sessions.some((s) => s && s.runtimeMetadata.languageId === 'r');
    }
    catch {
        return false;
    }
}
async function runTextInTerm(code, focus = false) {
    try {
        // positron.runtime.executeCode(languageId, code, focus, terminal?, mode?, ???, observer?)
        const mode = focus ? positron.RuntimeCodeExecutionMode.Interactive : positron.RuntimeCodeExecutionMode.Silent;
        await positron.runtime.executeCode('r', code, focus, undefined, mode);
        console.info('[rTerminal] Code executed:', code);
    }
    catch (error) {
        console.error('[rTerminal] Error executing code:', error);
        void vscode_1.window.showErrorMessage(`Failed to execute code in R console: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function waitForFile(filePath, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const interval = setInterval(() => {
            if (fs.existsSync(filePath)) {
                clearInterval(interval);
                resolve();
            }
            else if (Date.now() - start > timeout) {
                clearInterval(interval);
                reject(new Error(`Timeout waiting for file: ${filePath}`));
            }
        }, 100);
    });
}
// Addin picker functionality
async function getAddinPickerItems() {
    const items = [];
    // Generate a temporary file path for the JSON output
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `rstudio_addins_${Date.now()}.json`);
    console.log('[getAddinPickerItems] Temp file:', tempFile);
    const rCode = `
        tryCatch({
            # Get all installed packages
            pkgs <- .packages(all.available = TRUE)
            
            addin_list <- list()
            
            for (pkg in pkgs) {
                dcf_path <- system.file("rstudio", "addins.dcf", package = pkg)
                if (file.exists(dcf_path)) {
                    addins <- read.dcf(dcf_path)
                    
                    for (i in seq_len(nrow(addins))) {
                        addin <- addins[i, , drop = FALSE]
                        addin_info <- list(
                            name = as.character(addin[1, "Name"]),
                            description = if ("Description" %in% colnames(addin)) as.character(addin[1, "Description"]) else "",
                            binding = as.character(addin[1, "Binding"]),
                            interactive = if ("Interactive" %in% colnames(addin)) tolower(as.character(addin[1, "Interactive"])) == "true" else FALSE,
                            package = pkg
                        )
                        addin_list[[length(addin_list) + 1]] <- addin_info
                    }
                }
            }
            
            # Write to temp file
            jsonlite::write_json(addin_list, ${JSON.stringify(tempFile)}, auto_unbox = TRUE)
            cat("Addins written to:", ${JSON.stringify(tempFile)}, "\\n")
        }, error = function(e) {
            cat("Error loading addins:", conditionMessage(e), "\\n")
        })
    `.trim();
    try {
        // Execute the R code to generate the JSON file
        await runTextInTerm(rCode, false); // focus = false for silent execution
        // Wait for the file to be created
        await waitForFile(tempFile);
        // Read the JSON file
        const fileContent = fs.readFileSync(tempFile, 'utf-8');
        const addins = JSON.parse(fileContent);
        console.log(`[getAddinPickerItems] Loaded ${addins.length} addins`);
        // Convert to QuickPickItems
        for (const addin of addins) {
            items.push({
                name: addin.name,
                label: addin.name,
                description: addin.description || '',
                detail: `${addin.package}::${addin.binding}`,
                package: addin.package,
                binding: addin.binding,
                interactive: addin.interactive
            });
        }
        // Clean up temp file
        fs.unlinkSync(tempFile);
    }
    catch (error) {
        console.error('[getAddinPickerItems] Error:', error);
        void vscode_1.window.showErrorMessage(`Failed to load addins: ${error instanceof Error ? error.message : String(error)}`);
    }
    return items;
}
function purgeAddinPickerItems() {
    // No-op for now, as we generate items dynamically
}
async function launchAddinPicker() {
    // Check for active R session
    if (!await isRSessionActive()) {
        void vscode_1.window.showErrorMessage('No active R session. Please start an R session first.');
        return;
    }
    // Get addins
    const items = await getAddinPickerItems();
    if (items.length === 0) {
        void vscode_1.window.showInformationMessage('No RStudio addins found. Install packages with addins to use this feature.');
        return;
    }
    // Show quick pick
    const selected = await vscode_1.window.showQuickPick(items, {
        placeHolder: 'Select an RStudio addin to run',
        matchOnDescription: true,
        matchOnDetail: true
    });
    if (selected) {
        // Execute the addin
        await sendCodeToRTerminal(`${selected.package}::${selected.binding}()`, false // focus = false to execute silently
        );
    }
}
async function sendCodeToRTerminal(code, focus = false, mode, observer) {
    // Wrapper around positron.runtime.executeCode that preserves
    // compatibility with callers that pass runtime options (mode/observer).
    // Signature: executeCode(languageId, code, focus, terminal?, mode?, ???, observer?)
    try {
        // If mode not provided, default based on focus
        const executionMode = mode ?? (focus ? positron.RuntimeCodeExecutionMode.Interactive : positron.RuntimeCodeExecutionMode.Silent);
        if (typeof observer !== 'undefined') {
            // Call with observer
            await positron.runtime.executeCode('r', code, focus, undefined, executionMode, undefined, observer);
        }
        else {
            // Call without observer
            await positron.runtime.executeCode('r', code, focus, undefined, executionMode);
        }
        console.info('[sendCodeToRTerminal] Executed:', code);
    }
    catch (error) {
        console.error('[sendCodeToRTerminal] Error:', error);
        void vscode_1.window.showErrorMessage(`Failed to execute code: ${error instanceof Error ? error.message : String(error)}`);
    }
}
//# sourceMappingURL=rstudioapi.js.map