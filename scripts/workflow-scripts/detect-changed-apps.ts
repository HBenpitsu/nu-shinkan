import { execFileSync } from "node:child_process";
import { repoRoot, type OutputMap, listApps, writeOutputs } from "./shared.js";

export function detectChangedApps(baseSha: string | undefined): OutputMap {
  const appNames = listApps();

  if (!baseSha || /^0+$/.test(baseSha)) {
    return {
      deploy_skipped: "false",
      changed_apps_csv: appNames.join(","),
    };
  }

  const diffOutput = execFileSync(
    "git",
    ["diff", "--name-only", `${baseSha}...HEAD`],
    {
      encoding: "utf8",
      cwd: repoRoot,
    },
  );
  const changedApps = new Set<string>();

  for (const line of diffOutput.split(/\r?\n/)) {
    const match = /^apps\/([^/]+)\//.exec(line);
    if (match?.[1]) {
      changedApps.add(match[1]);
    }
  }

  return {
    deploy_skipped: changedApps.size === 0 ? "true" : "false",
    changed_apps_csv: [...changedApps].sort().join(","),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeOutputs(detectChangedApps(process.env.BASE_SHA?.trim()));
}
