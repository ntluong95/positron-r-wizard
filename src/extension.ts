import * as vscode from "vscode";
import { launchAddinPicker } from "./rstudioapi";
import { registerScopeFeature } from "./scope/registerScopeFeature";

const R_PIPE_SETTING = "positron.r.pipe";
const USE_NATIVE_PIPE_SETTING = "positron.r.useNativePipe";

let isChanging = false;

function getPipeString(): "|>" | "%>%" {
  const config = vscode.workspace.getConfiguration();
  return config.get<string>(R_PIPE_SETTING) === "|>" ? "|>" : "%>%";
}

function getUseNativeBoolean(): boolean {
  const config = vscode.workspace.getConfiguration();
  return config.get<boolean>(USE_NATIVE_PIPE_SETTING, false);
}

async function setPipeString(value: "|>" | "%>%"): Promise<void> {
  const config = vscode.workspace.getConfiguration();
  await config.update(
    R_PIPE_SETTING,
    value,
    vscode.ConfigurationTarget.Workspace,
  );
}

async function setUseNativeBoolean(value: boolean): Promise<void> {
  const config = vscode.workspace.getConfiguration();
  await config.update(
    USE_NATIVE_PIPE_SETTING,
    value,
    vscode.ConfigurationTarget.Workspace,
  );
}

async function syncStringFromBool(): Promise<void> {
  if (isChanging) {
    return;
  }

  isChanging = true;
  try {
    const useNative = getUseNativeBoolean();
    const currentPipe = getPipeString();
    const nextPipe = useNative ? "|>" : "%>%";

    if (currentPipe !== nextPipe) {
      await setPipeString(nextPipe);
      vscode.window.showInformationMessage(
        `R pipe set to ${useNative ? "baseR |>" : "magrittr %>%"} (workspace)`,
      );
    }
  } finally {
    isChanging = false;
  }
}

async function syncBoolFromString(): Promise<void> {
  if (isChanging) {
    return;
  }

  isChanging = true;
  try {
    const pipe = getPipeString();
    const currentUseNative = getUseNativeBoolean();
    const nextUseNative = pipe === "|>";

    if (currentUseNative !== nextUseNative) {
      await setUseNativeBoolean(nextUseNative);
    }
  } finally {
    isChanging = false;
  }
}

async function formatPipesInDocument(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No active editor found.");
    return;
  }

  const document = editor.document;
  if (document.languageId !== "r") {
    vscode.window.showWarningMessage("This command only works with R files.");
    return;
  }

  const targetPipe = getPipeString();
  const sourcePipe = targetPipe === "|>" ? "%>%" : "|>";
  const text = document.getText();

  if (!text.includes(sourcePipe)) {
    vscode.window.showInformationMessage(
      `No ${sourcePipe} pipes found to replace.`,
    );
    return;
  }

  const escapedSourcePipe = sourcePipe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escapedSourcePipe, "g");
  const updatedText = text.replace(regex, targetPipe);

  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(text.length),
  );

  const edit = new vscode.WorkspaceEdit();
  edit.replace(document.uri, fullRange, updatedText);

  const success = await vscode.workspace.applyEdit(edit);
  if (!success) {
    vscode.window.showErrorMessage("Failed to format pipes in document.");
    return;
  }

  const replacementCount = (text.match(regex) || []).length;
  vscode.window.showInformationMessage(
    `Replaced ${replacementCount} occurrence(s) of ${sourcePipe} with ${targetPipe}.`,
  );
}

export function activate(context: vscode.ExtensionContext): void {
  void syncBoolFromString();

  const togglePipeCommand = vscode.commands.registerCommand(
    "positron-r-pipe-toggle.toggle",
    async () => {
      await setUseNativeBoolean(!getUseNativeBoolean());
      await syncStringFromBool();
    },
  );

  const launchAddinCommand = vscode.commands.registerCommand(
    "r.launchAddinPicker",
    async () => {
      await launchAddinPicker(context);
    },
  );

  const formatPipesCommand = vscode.commands.registerCommand(
    "positron-r-wizard.formatPipes",
    async () => {
      await formatPipesInDocument();
    },
  );

  context.subscriptions.push(
    togglePipeCommand,
    launchAddinCommand,
    formatPipesCommand,
    registerScopeFeature(context),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration(USE_NATIVE_PIPE_SETTING)) {
        await syncStringFromBool();
      } else if (event.affectsConfiguration(R_PIPE_SETTING)) {
        await syncBoolFromString();
      }
    }),
  );
}

export function deactivate(): void {}
