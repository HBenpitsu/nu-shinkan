import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { rootDir } from "../materialize/paths.js";
import { stripJsonComments } from "../materialize/utils.js";
import type { SyncChange, SyncMode } from "./types.js";

type VarsEditResult = {
  nextText: string;
  touched: string[];
};

export function syncWranglerLocalVars(
  appName: string,
  localVars: Record<string, string>,
  mode: SyncMode,
): SyncChange | undefined {
  const wranglerPath = resolve(rootDir, "apps", appName, "wrangler.jsonc");
  if (!existsSync(wranglerPath)) {
    return undefined;
  }

  const before = readFileSync(wranglerPath, "utf8");
  const parsed = JSON.parse(stripJsonComments(before)) as Record<
    string,
    unknown
  >;
  if (typeof parsed.main !== "string" || parsed.main.length === 0) {
    return undefined;
  }

  const updated = upsertTopLevelVars(before, localVars);
  if (updated.touched.length === 0) {
    return undefined;
  }

  if (mode === "apply") {
    writeFileSync(wranglerPath, updated.nextText, "utf8");
  }

  return { filePath: wranglerPath, keys: updated.touched };
}

function upsertTopLevelVars(
  source: string,
  updates: Record<string, string>,
): VarsEditResult {
  const varsKey = '"vars"';
  const varsIndex = source.indexOf(varsKey);
  if (varsIndex < 0) {
    throw new Error("Top-level vars block was not found in wrangler.jsonc");
  }

  const openBraceIndex = source.indexOf("{", varsIndex);
  if (openBraceIndex < 0) {
    throw new Error("Invalid vars object in wrangler.jsonc");
  }

  const closeBraceIndex = findMatchingBrace(source, openBraceIndex);
  const inner = source.slice(openBraceIndex + 1, closeBraceIndex);
  const existing = parseStringMap(inner);

  const touched: string[] = [];
  for (const [key, value] of Object.entries(updates)) {
    if (existing.get(key) !== value) {
      existing.set(key, value);
      touched.push(key);
    }
  }

  if (touched.length === 0) {
    return { nextText: source, touched };
  }

  const keyIndent = detectLineIndent(source, varsIndex);
  const childIndent = detectChildIndent(inner, keyIndent);
  const rendered = renderObject(existing, childIndent, keyIndent);
  const nextText = `${source.slice(0, openBraceIndex)}${rendered}${source.slice(closeBraceIndex + 1)}`;

  return { nextText, touched };
}

function parseStringMap(inner: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /"([^"]+)"\s*:\s*"([^"]*)"/g;
  let match = re.exec(inner);

  while (match) {
    const key = match[1];
    const value = match[2];
    if (key !== undefined && value !== undefined) {
      out.set(key, value);
    }
    match = re.exec(inner);
  }

  return out;
}

function renderObject(
  entries: Map<string, string>,
  childIndent: string,
  keyIndent: string,
): string {
  const lines = [...entries.entries()].map(([key, value], index, arr) => {
    const comma = index === arr.length - 1 ? "" : ",";
    return `${childIndent}"${key}": "${value}"${comma}`;
  });

  if (lines.length === 0) {
    return "{}";
  }

  return `{\n${lines.join("\n")}\n${keyIndent}}`;
}

function detectLineIndent(source: string, start: number): string {
  let i = start - 1;
  while (i >= 0 && source[i] !== "\n") {
    i -= 1;
  }

  const lineStart = i + 1;
  let j = lineStart;
  while (j < source.length && (source[j] === " " || source[j] === "\t")) {
    j += 1;
  }

  return source.slice(lineStart, j);
}

function detectChildIndent(inner: string, keyIndent: string): string {
  const lines = inner.split(/\r?\n/);
  for (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }

    const m = /^(\s*)/.exec(line);
    const indent = m?.[1];
    if (indent && indent.length > 0) {
      return indent;
    }
  }

  return `${keyIndent}  `;
}

function findMatchingBrace(source: string, openBraceIndex: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = openBraceIndex; i < source.length; i += 1) {
    const ch = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth += 1;
      continue;
    }

    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }

  throw new Error("Could not find matching brace in wrangler.jsonc vars block");
}
