import { cwd } from "process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { isRecord } from "../shared-helper.js";
import {
  applyEdits,
  modify as modifyJsonc,
  parse as parseJsonc,
} from "jsonc-parser";
import { dirname } from "path";
const src = `${cwd()}/wrangler.jsonc`;
const gen = `${cwd()}/.generated/wrangler.jsonc`;
function exists() {
  return existsSync(src);
}
function read() {
  const content = readFileSync(src, "utf-8");
  const parsed = parseJsonc(content);
  if (typeof parsed.vars === "string")
    throw new Error("Expected parsed.vars to be an object, but got a string.");
  if (typeof parsed.env === "string")
    throw new Error("Expected parsed.env to be an object, but got a string.");
  return {
    ...parsed,
    name: parsed.name ?? "",
    vars: parsed.vars ?? {},
    env: parsed.env ?? {},
  };
}
function patch(original, values) {
  const formattingOptions = {
    insertSpaces: true,
    tabSize: 2,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    if (["vars", "env"].includes(key)) {
      if (!isRecord(value)) {
        throw new Error(
          `Expected ${key} to be a record, but got a non-record value ${JSON.stringify(value)}.`,
        );
      }
      for (const [subKey, subValue] of Object.entries(value)) {
        if (subValue === undefined) continue;
        const nextEdits = modifyJsonc(original, [key, subKey], subValue, {
          formattingOptions,
        });
        original = applyEdits(original, nextEdits);
      }
    } else {
      const nextEdits = modifyJsonc(original, [key], value, {
        formattingOptions,
      });
      original = applyEdits(original, nextEdits);
    }
  }
  return original;
}
function modify(values) {
  const originalContent = readFileSync(src, "utf-8");
  const patchedContent = patch(originalContent, values);
  writeFileSync(src, patchedContent, "utf-8");
}
function generate(values) {
  if (!existsSync(dirname(gen))) {
    mkdirSync(dirname(gen), { recursive: true });
  }
  const content = JSON.stringify(values, null, 2) + "\n";
  writeFileSync(gen, content, "utf-8");
}
export const testExport = {
  patch,
};
export const wranglerJsonc = {
  exists,
  read,
  modify,
  generate,
};
