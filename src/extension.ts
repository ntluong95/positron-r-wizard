import * as vscode from "vscode";

const R_PIPE_SETTING = "positron.r.pipe";
const USE_NATIVE_PIPE_SETTING = "positron.r.useNativePipe";

let isChanging = false;

// Utility Functions
function getPipeString(): "|>" | "%>%" {
  const config = vscode.workspace.getConfiguration();
  const pipe = config.get<string>(R_PIPE_SETTING);
  if (pipe === "|>") {
    return "|>";
  }
  return "%>%";
}

function getUseNativeBoolean(): boolean {
  const config = vscode.workspace.getConfiguration();
  return config.get<boolean>(USE_NATIVE_PIPE_SETTING, false);
}

async function setPipeString(value: "|>" | "%>%") {
  const config = vscode.workspace.getConfiguration();
  await config.update(
    R_PIPE_SETTING,
    value,
    vscode.ConfigurationTarget.Workspace
  );
}

async function setUseNativeBoolean(value: boolean) {
  const config = vscode.workspace.getConfiguration();
  await config.update(
    USE_NATIVE_PIPE_SETTING,
    value,
    vscode.ConfigurationTarget.Workspace
  );
}

async function syncStringFromBool() {
  if (isChanging) return;
  isChanging = true;
  const useNative = getUseNativeBoolean();
  const currentPipe = getPipeString();
  const newPipe = useNative ? "|>" : "%>%";
  if (currentPipe !== newPipe) {
    await setPipeString(newPipe);
    vscode.window.showInformationMessage(
      `R pipe set to ${useNative ? "baseR |>" : "magrittr %>%"} (workspace)`
    );
  }
  isChanging = false;
}

async function syncBoolFromString() {
  if (isChanging) return;
  isChanging = true;
  const pipe = getPipeString();
  const currentUseNative = getUseNativeBoolean();
  const newUseNative = pipe === "|>";
  if (currentUseNative !== newUseNative) {
    await setUseNativeBoolean(newUseNative);
  }
  isChanging = false;
}

export function activate(context: vscode.ExtensionContext) {
  // Initial sync
  syncBoolFromString();

  // Register command
  const toggleCommand = vscode.commands.registerCommand(
    "positron-r-pipe-toggle.toggle",
    async () => {
      const currentValue = getUseNativeBoolean();
      await setUseNativeBoolean(!currentValue);
      await syncStringFromBool();
    }
  );

  context.subscriptions.push(toggleCommand);

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration(USE_NATIVE_PIPE_SETTING)) {
        await syncStringFromBool();
      } else if (e.affectsConfiguration(R_PIPE_SETTING)) {
        await syncBoolFromString();
      }
    })
  );
}

export function deactivate() {}
