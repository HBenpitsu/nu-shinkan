import { readFileSync, writeFileSync } from "node:fs";
import YAML from "yaml";
import { globalFile, asGlobalRuntimeEnvs } from "@repo/app-config/global";
import { execFileSync } from "node:child_process";
import { findWorkspaceRoot } from "../workspace/workspace.js";
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
  sync(values.root, values["dry-run"] || values.check);
}

export function sync(root = findWorkspaceRoot(), dryRun = false): void {
  const document = YAML.parseDocument(readFileSync(globalFile, "utf8"));
  const local = asGlobalRuntimeEnvs(document.toJS()).local;
  // sync:localを登録したパッケージだけをTurboで同期する。
  execFileSync(
    "pnpm",
    [
      "exec",
      "turbo",
      "run",
      "sync:local",
      ...(dryRun ? ["--", "--dry-run"] : []),
    ],
    { cwd: root, stdio: "inherit" },
  );
  // 登録された同期タスクがすべて成功した場合だけ、共有の削除指示を消費する。
  if (!dryRun && Object.values(local).includes(null)) {
    for (const [key, value] of Object.entries(local))
      if (value === null) document.deleteIn(["local", key]);
    writeFileSync(globalFile, document.toString());
  }
}

// EntryPoint
try {
  if (!process.env.VITEST) main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
