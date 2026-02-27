import * as vscode from "vscode";
import { CodeBlock } from "./types";

type DelimiterKind = "brace" | "paren" | "bracket";

interface ParseState {
  inSingleQuote: boolean;
  inDoubleQuote: boolean;
  inBacktick: boolean;
}

interface DelimiterStackItem {
  kind: DelimiterKind;
  closeChar: ")" | "]" | "}";
  headerStartLine: number;
  headerEndLine: number;
  openColumn: number;
}

function isEscaped(text: string, index: number): boolean {
  let backslashCount = 0;
  let cursor = index - 1;
  while (cursor >= 0 && text[cursor] === "\\") {
    backslashCount++;
    cursor--;
  }
  return backslashCount % 2 === 1;
}

function stripComment(lineText: string): string {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;

  for (let i = 0; i < lineText.length; i++) {
    const char = lineText[i];

    if (inSingleQuote) {
      if (char === "'" && !isEscaped(lineText, i)) {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      if (char === '"' && !isEscaped(lineText, i)) {
        inDoubleQuote = false;
      }
      continue;
    }

    if (inBacktick) {
      if (char === "`") {
        inBacktick = false;
      }
      continue;
    }

    if (char === "#") {
      return lineText.slice(0, i);
    }

    if (char === "'") {
      inSingleQuote = true;
      continue;
    }

    if (char === '"') {
      inDoubleQuote = true;
      continue;
    }

    if (char === "`") {
      inBacktick = true;
    }
  }

  return lineText;
}

function isOnlyOpeningBrace(lineText: string): boolean {
  const codePart = stripComment(lineText);
  return /^\s*\{\s*$/.test(codePart);
}

function isLikelyContinuation(lineText: string): boolean {
  const code = stripComment(lineText).trim();
  if (!code) {
    return false;
  }

  if (/[,+\-*/=~[(|&]$/.test(code)) {
    return true;
  }

  return (
    code.endsWith("%>%") ||
    code.endsWith("|>") ||
    code.endsWith("&&") ||
    code.endsWith("||") ||
    code.endsWith("->") ||
    code.endsWith("->>") ||
    code.endsWith("<-") ||
    code.endsWith("<<-")
  );
}

function findPreviousMeaningfulLine(
  document: vscode.TextDocument,
  fromLine: number,
): number | undefined {
  for (let line = fromLine; line >= 0; line--) {
    const code = stripComment(document.lineAt(line).text).trim();
    if (code.length > 0) {
      return line;
    }
  }
  return undefined;
}

function findHeaderStartLine(
  document: vscode.TextDocument,
  openingBraceLine: number,
): number {
  let headerStart = openingBraceLine;

  if (isOnlyOpeningBrace(document.lineAt(openingBraceLine).text)) {
    const previousMeaningful = findPreviousMeaningfulLine(
      document,
      openingBraceLine - 1,
    );
    if (previousMeaningful !== undefined) {
      headerStart = previousMeaningful;
    }
  }

  while (headerStart > 0) {
    const previousLineText = document.lineAt(headerStart - 1).text;
    if (!isLikelyContinuation(previousLineText)) {
      break;
    }
    headerStart--;
  }

  return headerStart;
}

function findLastContentLine(
  document: vscode.TextDocument,
  fallbackLine: number,
): number {
  for (let line = document.lineCount - 1; line > fallbackLine; line--) {
    const text = stripComment(document.lineAt(line).text).trim();
    if (text.length > 0) {
      return line;
    }
  }
  return fallbackLine;
}

function popMatchingDelimiter(
  stack: DelimiterStackItem[],
  closeChar: ")" | "]" | "}",
): DelimiterStackItem | undefined {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].closeChar === closeChar) {
      const [item] = stack.splice(i, 1);
      return item;
    }
  }
  return undefined;
}

function buildBlock(
  document: vscode.TextDocument,
  opening: DelimiterStackItem,
  endLine: number,
): CodeBlock {
  const endColumn = document.lineAt(endLine).text.length;
  return {
    openRange: new vscode.Range(
      opening.headerStartLine,
      opening.openColumn,
      opening.headerStartLine,
      opening.openColumn,
    ),
    closeRange: new vscode.Range(endLine, endColumn, endLine, endColumn),
    headerEndLine: opening.headerEndLine,
  };
}

function parseDelimitedBlocks(document: vscode.TextDocument): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const stack: DelimiterStackItem[] = [];
  const state: ParseState = {
    inSingleQuote: false,
    inDoubleQuote: false,
    inBacktick: false,
  };

  for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
    const lineText = document.lineAt(lineNum).text;

    for (let charIndex = 0; charIndex < lineText.length; charIndex++) {
      const char = lineText[charIndex];

      if (state.inSingleQuote) {
        if (char === "'" && !isEscaped(lineText, charIndex)) {
          state.inSingleQuote = false;
        }
        continue;
      }

      if (state.inDoubleQuote) {
        if (char === '"' && !isEscaped(lineText, charIndex)) {
          state.inDoubleQuote = false;
        }
        continue;
      }

      if (state.inBacktick) {
        if (char === "`") {
          state.inBacktick = false;
        }
        continue;
      }

      if (char === "#") {
        break;
      }

      if (char === "'") {
        state.inSingleQuote = true;
        continue;
      }

      if (char === '"') {
        state.inDoubleQuote = true;
        continue;
      }

      if (char === "`") {
        state.inBacktick = true;
        continue;
      }

      if (char === "{") {
        stack.push({
          kind: "brace",
          closeChar: "}",
          headerStartLine: findHeaderStartLine(document, lineNum),
          headerEndLine: lineNum,
          openColumn: charIndex + 1,
        });
        continue;
      }

      if (char === "(") {
        stack.push({
          kind: "paren",
          closeChar: ")",
          headerStartLine: lineNum,
          headerEndLine: lineNum,
          openColumn: charIndex + 1,
        });
        continue;
      }

      if (char === "[") {
        stack.push({
          kind: "bracket",
          closeChar: "]",
          headerStartLine: lineNum,
          headerEndLine: lineNum,
          openColumn: charIndex + 1,
        });
        continue;
      }

      if (char === ")" || char === "]" || char === "}") {
        const opening = popMatchingDelimiter(stack, char);
        if (!opening) {
          continue;
        }

        const isMultiLine = lineNum > opening.headerStartLine;
        if (opening.kind === "brace" || isMultiLine) {
          blocks.push(buildBlock(document, opening, lineNum));
        }
      }
    }
  }

  while (stack.length > 0) {
    const opening = stack.pop()!;
    const endLine = findLastContentLine(document, opening.headerEndLine);
    const isMultiLine = endLine > opening.headerStartLine;
    if (opening.kind === "brace" || isMultiLine) {
      blocks.push(buildBlock(document, opening, endLine));
    }
  }

  return blocks;
}

function isLineStartingWithPipe(code: string): boolean {
  return /^\s*(\|>|%>%|\+)\s*/.test(code);
}

function isLineEndingWithPipe(code: string): boolean {
  return /(\|>|%>%|\+)\s*$/.test(code);
}

interface PipeLineInfo {
  isCode: boolean;
  startsWithPipe: boolean;
  endsWithPipe: boolean;
  depthStart: number;
  depthEnd: number;
}

function computePipeLineInfos(document: vscode.TextDocument): PipeLineInfo[] {
  const infos: PipeLineInfo[] = [];
  const state: ParseState = {
    inSingleQuote: false,
    inDoubleQuote: false,
    inBacktick: false,
  };
  let depth = 0;

  for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
    const lineText = document.lineAt(lineNum).text;
    const depthStart = depth;
    let codeChars = "";

    for (let charIndex = 0; charIndex < lineText.length; charIndex++) {
      const char = lineText[charIndex];

      if (state.inSingleQuote) {
        codeChars += char;
        if (char === "'" && !isEscaped(lineText, charIndex)) {
          state.inSingleQuote = false;
        }
        continue;
      }

      if (state.inDoubleQuote) {
        codeChars += char;
        if (char === '"' && !isEscaped(lineText, charIndex)) {
          state.inDoubleQuote = false;
        }
        continue;
      }

      if (state.inBacktick) {
        codeChars += char;
        if (char === "`") {
          state.inBacktick = false;
        }
        continue;
      }

      if (char === "#") {
        break;
      }

      codeChars += char;

      if (char === "'") {
        state.inSingleQuote = true;
        continue;
      }

      if (char === '"') {
        state.inDoubleQuote = true;
        continue;
      }

      if (char === "`") {
        state.inBacktick = true;
        continue;
      }

      if (char === "(" || char === "[" || char === "{") {
        depth++;
        continue;
      }

      if ((char === ")" || char === "]" || char === "}") && depth > 0) {
        depth--;
      }
    }

    const code = codeChars.trim();
    infos.push({
      isCode: code.length > 0,
      startsWithPipe: isLineStartingWithPipe(code),
      endsWithPipe: isLineEndingWithPipe(code),
      depthStart,
      depthEnd: depth,
    });
  }

  return infos;
}

function parsePipeBlocks(document: vscode.TextDocument): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const lineInfos = computePipeLineInfos(document);
  let chainStart: number | undefined;
  let chainEnd: number | undefined;
  let chainBaseDepth: number | undefined;
  let previousLineEndedWithPipe = false;

  const flushChain = () => {
    if (
      chainStart !== undefined &&
      chainEnd !== undefined &&
      chainEnd > chainStart
    ) {
      const endColumn = document.lineAt(chainEnd).text.length;
      blocks.push({
        openRange: new vscode.Range(chainStart, 0, chainStart, 0),
        closeRange: new vscode.Range(chainEnd, endColumn, chainEnd, endColumn),
        headerEndLine: chainStart,
      });
    }

    chainStart = undefined;
    chainEnd = undefined;
    chainBaseDepth = undefined;
    previousLineEndedWithPipe = false;
  };

  const startChain = (
    lineNum: number,
    startsWithPipe: boolean,
    endsWithPipe: boolean,
  ) => {
    if (!startsWithPipe && !endsWithPipe) {
      return;
    }

    if (startsWithPipe) {
      const previousMeaningful = findPreviousMeaningfulLine(document, lineNum - 1);
      chainStart =
        previousMeaningful !== undefined && previousMeaningful === lineNum - 1
          ? previousMeaningful
          : lineNum;
    } else {
      chainStart = lineNum;
    }

    chainEnd = lineNum;
    chainBaseDepth = lineInfos[lineNum].depthStart;
    previousLineEndedWithPipe = endsWithPipe;
  };

  for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
    const info = lineInfos[lineNum];
    if (!info.isCode) {
      if (
        chainStart !== undefined &&
        chainBaseDepth !== undefined &&
        info.depthStart > chainBaseDepth
      ) {
        chainEnd = lineNum;
        continue;
      }
      flushChain();
      continue;
    }

    if (chainStart === undefined) {
      startChain(lineNum, info.startsWithPipe, info.endsWithPipe);
      continue;
    }

    const isNestedUnderChain =
      chainBaseDepth !== undefined && info.depthStart > chainBaseDepth;
    const isContinuation =
      info.startsWithPipe || previousLineEndedWithPipe || isNestedUnderChain;
    if (isContinuation) {
      chainEnd = lineNum;
      previousLineEndedWithPipe = info.endsWithPipe;
      continue;
    }

    flushChain();
    startChain(lineNum, info.startsWithPipe, info.endsWithPipe);
  }

  flushChain();
  return blocks;
}

export function parseRBlocks(document: vscode.TextDocument): CodeBlock[] {
  const allBlocks = [...parseDelimitedBlocks(document), ...parsePipeBlocks(document)];
  const seen = new Set<string>();

  return allBlocks.filter((block) => {
    const key = `${block.openRange.start.line}:${block.headerEndLine}:${block.closeRange.end.line}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
