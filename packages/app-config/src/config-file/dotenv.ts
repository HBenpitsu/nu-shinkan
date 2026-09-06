import { cwd } from "process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";

const src = `${cwd()}/.env.development`;
const gen = `${cwd()}/.env.deploy`;

export type DotenvVariables = { [key: string]: string };

// Main Logic

function exists(): boolean {
  return existsSync(src);
}

function read(): DotenvVariables {
  const content = readFileSync(src, "utf-8");
  const lines = content.split("\n");
  const result: DotenvVariables = {};
  for (const line of lines) {
    const equal = line.indexOf("=");
    if (equal < 0 || line.trimStart().startsWith("#")) continue;
    const key = line.slice(0, equal);
    let value = line.slice(equal + 1).trim();
    if (value.startsWith('"')) {
      try {
        value = JSON.parse(value);
      } catch {
        /* retain raw value */
      }
    } else if (value.startsWith("'") && value.endsWith("'"))
      value = value.slice(1, -1);
    if (key && value !== undefined) {
      result[key.trim()] = value.trim();
    }
  }
  return result;
}

function modify(
  values: Record<string, string | null | undefined>,
  dryRun = false,
) {
  const originalContent = readFileSync(src, "utf-8");
  const patchedContent = patch(originalContent, values);
  if (!dryRun) writeFileSync(src, patchedContent, "utf-8");
}

function generate(values: DotenvVariables) {
  if (!existsSync(dirname(gen))) {
    mkdirSync(dirname(gen), { recursive: true });
  }
  const content = Object.entries(values)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("\n");
  writeFileSync(gen, content, "utf-8");
}

function withVitePrefix<T extends string | null>(
  values: Record<string, T>,
): Record<string, T> {
  const prefixed: Record<string, T> = {};
  for (const [key, value] of Object.entries(values)) {
    if (key.startsWith("VITE_")) {
      prefixed[key] = value;
    } else {
      prefixed[`VITE_${key}`] = value;
    }
  }
  return prefixed;
}

// Helper

function patch(
  original: string,
  values: Record<string, string | null | undefined>,
): string {
  const remaining = new Set(Object.keys(values));
  const result: string[] = [];
  // コメントと対象外の行を保持し、指定キーの重複は一つにまとめる。
  for (const line of original.split("\n")) {
    const equal = line.indexOf("=");
    const key = line.slice(0, equal).trim();
    if (
      equal < 0 ||
      line.trimStart().startsWith("#") ||
      !Object.hasOwn(values, key) ||
      values[key] === undefined
    ) {
      result.push(line);
      continue;
    }
    if (remaining.has(key) && values[key] !== null)
      result.push(`${key}=${JSON.stringify(values[key])}`);
    remaining.delete(key);
  }
  // nullは削除指示。新規キーでもnull自体を書き込まない。
  for (const key of remaining)
    if (values[key] !== null && values[key] !== undefined)
      result.push(`${key}=${JSON.stringify(values[key])}`);
  return result.join("\n");
}
export const testExport = {
  patch,
};
export const dotenv = {
  exists,
  read,
  modify,
  generate,
  withVitePrefix,
};
