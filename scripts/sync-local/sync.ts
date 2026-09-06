import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import { globalFile, asGlobalRuntimeEnvs } from "@repo/app-config/global";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  listWorkspacePackages,
  findWorkspaceRoot,
} from "../workspace/workspace.js";
import { parseArgs } from "node:util";

// Main Logic

function main() {
  const { values } = parseArgs({
    options: {
      root: { type: "string" },
      "dry-run": { type: "boolean" },
      check: { type: "boolean" },
    },
  });
  syncLocal(values.root, values["dry-run"] || values.check);
}

export function syncLocal(
  root = findWorkspaceRoot(),
  dryRun = false,
  file: string | URL = globalFile,
): void {
  const document = YAML.parseDocument(readFileSync(file, "utf8"));
  const local = asGlobalRuntimeEnvs(document.toJS()).local;
  // Turboはタスク未登録のパッケージを省くため、同期対象の登録漏れを先に検出する。
  for (const pkg of listWorkspacePackages(root)) {
    const directory = resolve(root, pkg.path);
    if (
      ![".env.development", "wrangler.jsonc"].some((name) =>
        existsSync(resolve(directory, name)),
      )
    )
      continue;
    const manifest = JSON.parse(
      readFileSync(resolve(directory, "package.json"), "utf8"),
    );
    if (!manifest.scripts?.["sync:local"])
      throw new Error(`Missing sync:local task: ${pkg.package}`);
  }
  execFileSync(
    "pnpm",
    [
      "exec",
      "turbo",
      "run",
      "sync:local",
      "--",
      "--global",
      typeof file === "string" ? resolve(file) : fileURLToPath(file),
      ...(dryRun ? ["--dry-run"] : []),
    ],
    { cwd: root, stdio: "inherit" },
  );
  // Consume deletions only after every package has been updated successfully.
  if (!dryRun && Object.values(local).includes(null)) {
    for (const [key, value] of Object.entries(local))
      if (value === null) document.deleteIn(["local", key]);
    writeFileSync(file, document.toString());
  }
}

// EntryPoint
try {
  if (!process.env.VITEST) main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
