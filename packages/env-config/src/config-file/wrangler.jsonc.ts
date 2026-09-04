import { cwd } from "process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import {
  applyEdits,
  modify as modifyJsonc,
  parse as parseJsonc,
} from "jsonc-parser";

const src = `${cwd()}/wrangler.jsonc`;
const gen = `${cwd()}/.generated/wrangler.jsonc`;

export type WranglerObject =
  | {
      name: string;
      vars: { [key: string]: string };
      env: { [key: string]: object };
    }
  | { [key: string]: string };

function exists(): boolean {
  return existsSync(src);
}
function read(): WranglerObject {
  const content = readFileSync(src, "utf-8");
  const parsed = parseJsonc(content) as WranglerObject;
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
function patch(original: string, values: Partial<WranglerObject>): string {
  const formattingOptions = {
    insertSpaces: true,
    tabSize: 2,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;

    if (["vars", "env"].includes(key)) {
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
function modify(values: Partial<WranglerObject>) {
  const originalContent = readFileSync(src, "utf-8");
  const patchedContent = patch(originalContent, values);
  writeFileSync(src, patchedContent, "utf-8");
}
function generate(values: WranglerObject) {
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
