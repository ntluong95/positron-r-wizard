import * as vscode from "vscode";

export interface CodeBlock {
  openRange: vscode.Range;
  closeRange: vscode.Range;
  headerEndLine: number;
  childBlocks?: { firstLine: number; lastLine: number }[];
}
