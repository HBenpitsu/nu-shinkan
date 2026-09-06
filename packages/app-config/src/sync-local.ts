#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import YAML from "yaml";
import { applyEdits, modify } from "jsonc-parser";
import {
  globalFile,
  readGlobalRuntimeEnvs,
} from "./config-file/globalRuntimeEnvs.yaml.js";
import { workspacePackages, workspaceRoot } from "./workspace.js";
export function syncLocal(root = workspaceRoot(), dryRun = false): void {
  const local = readGlobalRuntimeEnvs().local;
  for (const pkg of workspacePackages(root)) {
    const envFile = join(root, pkg.path, ".env.development");
    if (existsSync(envFile)) {
      let lines = readFileSync(envFile, "utf8").split("\n");
      for (const [key, value] of Object.entries(local)) {
        const name = key.startsWith("VITE_") ? key : `VITE_${key}`;
        lines = lines.filter((line) => line.split("=")[0]?.trim() !== name);
        if (value !== null) lines.push(`${name}=${JSON.stringify(value)}`);
      }
      if (!dryRun) writeFileSync(envFile, lines.join("\n"));
    }
    const wrangler = join(root, pkg.path, "wrangler.jsonc");
    if (existsSync(wrangler)) {
      let content = readFileSync(wrangler, "utf8");
      for (const [key, value] of Object.entries(local))
        content = applyEdits(
          content,
          modify(content, ["vars", key], value === null ? undefined : value, {
            formattingOptions: { insertSpaces: true, tabSize: 2 },
          }),
        );
      if (!dryRun) writeFileSync(wrangler, content);
    }
  }
  // Only remove tombstones after every native file has been updated successfully.
  if (!dryRun && Object.values(local).includes(null)) {
    const doc = YAML.parseDocument(readFileSync(globalFile, "utf8"));
    for (const [key, value] of Object.entries(local))
      if (value === null) doc.deleteIn(["local", key]);
    writeFileSync(globalFile, doc.toString());
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  syncLocal(
    undefined,
    process.argv.includes("--dry-run") || process.argv.includes("--check"),
  );
