import { cwd } from "process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname } from "path";

const src = `${cwd()}/.env.development`;
const gen = `${cwd()}/.generated/.env.deploy`;

export type DotenvVariables = { [key: string]: string };

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
function patch(original: string, values: Partial<DotenvVariables>): string {
  const lines = original.split("\n");
  const result: string[] = [];
  // patch with values
  for (const line of lines) {
    const lineTrimmed = line.trim();
    if (!lineTrimmed || lineTrimmed.startsWith("#")) {
      result.push(line);
      continue;
    }

    let [key] = lineTrimmed.split("=");
    if (!key) {
      result.push(line);
      continue;
    }
    key = key.trim();
    if (values[key] === undefined) {
      result.push(line);
      continue;
    } else {
      result.push(`${key}=${values[key]}`);
      delete values[key];
    }
  }
  // append remaining new values
  for (const [key, value] of Object.entries(values)) {
    result.push(`${key}=${value}`);
  }
  return result.join("\n");
}
function modify(values: Partial<DotenvVariables>) {
  const originalContent = readFileSync(src, "utf-8");
  const patchedContent = patch(originalContent, values);
  writeFileSync(src, patchedContent, "utf-8");
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
function prefix(values: DotenvVariables): DotenvVariables {
  const prefixed: DotenvVariables = {};
  for (const [key, value] of Object.entries(values)) {
    if (key.startsWith("VITE_")) {
      prefixed[key] = value;
    } else {
      prefixed[`VITE_${key}`] = value;
    }
  }
  return prefixed;
}

export const testExport = {
  patch,
};
export const dotenv = {
  exists,
  read,
  modify,
  generate,
  prefix,
};
