import * as vscode from "vscode";
import { ChangeColorCommand } from "../commands/ChangeColorCommand";
import { ChangeOpacityCommand } from "../commands/ChangeOpacityCommand";
import { SelectBlockCommand } from "../commands/SelectBlockCommand";
import { UndoBlockSelectionCommand } from "../commands/UndoBlockSelectionCommand";
import { Highlighter } from "../decorations/Highlighter";
import { debounce } from "../utils/debounce";

const SCOPE_CONFIG_SECTION = "positron-r-wizard.scope";

function isScopeEnabled(): boolean {
  return vscode.workspace
    .getConfiguration(SCOPE_CONFIG_SECTION)
    .get<boolean>("enabled", true);
}

export function registerScopeFeature(
  context: vscode.ExtensionContext,
): vscode.Disposable {
  const highlighter = new Highlighter();

  const commands = [
    new ChangeColorCommand(highlighter),
    new ChangeOpacityCommand(highlighter),
    new SelectBlockCommand(highlighter),
    new UndoBlockSelectionCommand(highlighter),
  ];

  commands.forEach((command) => {
    context.subscriptions.push(command.register());
  });

  const updateDecorations = (editor: vscode.TextEditor) => {
    if (!isScopeEnabled()) {
      highlighter.clearAllDecorations(editor);
      return;
    }

    highlighter.invalidateBlockTree();
    highlighter.updateDecorations(editor);
  };

  const debouncedUpdate = debounce(updateDecorations, 100);

  const listeners = vscode.Disposable.from(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor || event.document !== activeEditor.document) {
        return;
      }

      if (event.contentChanges.length > 1) {
        highlighter.clearAllDecorations(activeEditor);
        updateDecorations(activeEditor);
        return;
      }

      debouncedUpdate(activeEditor);
    }),
    vscode.window.onDidChangeTextEditorSelection((event) => {
      const now = Date.now();
      if (now - highlighter.lastSelectionTimestamp > 100) {
        highlighter.resetSelectionState(event.textEditor);
      }
      debouncedUpdate(event.textEditor);
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        debouncedUpdate(editor);
      }
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration(SCOPE_CONFIG_SECTION)) {
        return;
      }

      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        return;
      }

      if (!isScopeEnabled()) {
        highlighter.clearAllDecorations(activeEditor);
        return;
      }

      updateDecorations(activeEditor);
    }),
  );

  const initialEditor = vscode.window.activeTextEditor;
  if (initialEditor) {
    updateDecorations(initialEditor);
  }

  return vscode.Disposable.from(
    listeners,
    new vscode.Disposable(() => {
      highlighter.dispose();
    }),
  );
}
