import * as vscode from "vscode";
import { Command } from "./Command";
import { Highlighter } from "../decorations/Highlighter";

export class ChangeColorCommand extends Command {
  private readonly configKey = "positron-r-wizard.scope.blockHighlightColor";

  constructor(private highlighter: Highlighter) {
    super();
  }

  public register(): vscode.Disposable {
    return vscode.commands.registerCommand(
      "positron-r-wizard.scope.changeColor",
      async () => {
      interface ColorOption extends vscode.QuickPickItem {
        value: string;
      }

      const colorOptions: ColorOption[] = [
        { label: "Default", value: "42,65,132" },
        { label: "Red", value: "255, 69, 69" },
        { label: "Yellow", value: "243, 255, 69" },
        { label: "Blue", value: "69, 69, 255" },
        { label: "Custom RGB...", value: "custom" },
      ];

      const selectedColor = await vscode.window.showQuickPick(colorOptions, {
        placeHolder: "Select an R scope highlight color",
      });

      if (!selectedColor) {
        return;
      }

      let nextColor = selectedColor.value;
      if (selectedColor.value === "custom") {
        const customColor = await vscode.window.showInputBox({
          placeHolder: "42,65,132",
          prompt:
            "Enter RGB values as r, g, b where each value is between 0 and 255",
          validateInput: (value) => {
            const parts = value.split(",").map((part) => part.trim());
            if (parts.length !== 3) {
              return "Use the format: r, g, b";
            }

            for (const part of parts) {
              const number = Number(part);
              if (!Number.isInteger(number) || number < 0 || number > 255) {
                return "Each value must be an integer between 0 and 255";
              }
            }

            return null;
          },
        });

        if (!customColor) {
          return;
        }
        nextColor = customColor
          .split(",")
          .map((part) => String(Number(part.trim())))
          .join(", ");
      }

      const config = vscode.workspace.getConfiguration();
      await config.update(
        this.configKey,
        nextColor,
        vscode.ConfigurationTarget.Global,
      );

      vscode.window.showInformationMessage(
        `R scope highlight color updated to: ${nextColor}`,
      );
      this.highlighter.updateDecorations(vscode.window.activeTextEditor);
    },
    );
  }
}
