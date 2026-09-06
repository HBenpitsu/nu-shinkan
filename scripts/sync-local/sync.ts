import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import { globalFile, parseGlobalRuntimeEnvs } from "@repo/app-config/global";
import { syncPackageLocal } from "@repo/app-config/sync-local";
import { workspacePackages, workspaceRoot } from "../workspace/workspace.js";

export function syncLocal(
  root = workspaceRoot(),
  dryRun = false,
  file: string | URL = globalFile,
): void {
  const document = YAML.parseDocument(readFileSync(file, "utf8"));
  const local = parseGlobalRuntimeEnvs(document.toJS()).local;
  for (const pkg of workspacePackages(root))
    syncPackageLocal(resolve(root, pkg.path), local, dryRun);
  // Consume deletions only after every package has been updated successfully.
  if (!dryRun && Object.values(local).includes(null)) {
    for (const [key, value] of Object.entries(local))
      if (value === null) document.deleteIn(["local", key]);
    writeFileSync(file, document.toString());
  }
}
