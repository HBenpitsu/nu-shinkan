import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { stripJsonComments } from "../env/materialize/utils.js";
import { listApps, repoRoot } from "./shared.js";

export function deletePreviewWorkers(prNumber: string | undefined): void {
  if (!prNumber) {
    throw new Error("Missing PR number");
  }

  for (const appName of listApps()) {
    const wranglerPath = resolve(repoRoot, "apps", appName, "wrangler.jsonc");
    if (!existsSync(wranglerPath)) {
      continue;
    }

    const base = JSON.parse(
      stripJsonComments(readFileSync(wranglerPath, "utf8")),
    ) as Record<string, unknown>;
    if (typeof base.main !== "string" || base.main.length === 0) {
      continue;
    }

    const baseName =
      typeof base.name === "string" && base.name.length > 0
        ? base.name
        : appName;
    const workerName = `${baseName}-preview-pr-${prNumber}`;

    try {
      execFileSync(
        "pnpm",
        [
          "--dir",
          resolve(repoRoot, "apps", appName),
          "exec",
          "wrangler",
          "delete",
          workerName,
          "--force",
        ],
        {
          encoding: "utf8",
          cwd: repoRoot,
          stdio: "inherit",
        },
      );
      console.log(`deleted=${workerName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`skip-delete=${workerName}: ${message}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  deletePreviewWorkers(process.env.PR_NUMBER?.trim());
}
