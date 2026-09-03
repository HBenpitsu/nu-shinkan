import { appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export type OutputMap = Record<string, string>;

export const repoRoot = resolve(
  fileURLToPath(new URL("../..", import.meta.url)),
);

export function listApps(): string[] {
  return execFileSync(
    "bash",
    ["-lc", "find apps -mindepth 1 -maxdepth 1 -type d -printf '%f\\n' | sort"],
    {
      encoding: "utf8",
      cwd: repoRoot,
    },
  )
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

type TurboTask = {
  taskId?: string;
  directory?: string;
  command?: string;
};

type TurboDryRunResult = {
  tasks?: TurboTask[];
};

export function detectChangedAppsWithTurbo(
  baseSha: string,
  deployTask: string,
): string[] {
  const raw = execFileSync(
    "pnpm",
    [
      "turbo",
      "run",
      deployTask,
      "--filter=./apps/*",
      `--filter=[${baseSha}]`,
      "--dry-run=json",
    ],
    {
      encoding: "utf8",
      cwd: repoRoot,
    },
  );

  const parsed = JSON.parse(raw) as TurboDryRunResult;
  const changedApps = new Set<string>();

  for (const task of parsed.tasks ?? []) {
    if (!task.directory?.startsWith("apps/")) {
      continue;
    }

    if (task.command === "<NONEXISTENT>") {
      continue;
    }

    const appName = task.directory.slice("apps/".length).split("/")[0];
    if (appName) {
      changedApps.add(appName);
    }
  }

  return [...changedApps].sort();
}

export function splitCsv(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function writeOutputs(outputs: OutputMap): void {
  const outputPath = process.env.GITHUB_OUTPUT?.trim();

  if (outputPath) {
    const lines = Object.entries(outputs).map(
      ([key, value]) => `${key}=${value}`,
    );
    appendFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
  }

  for (const [key, value] of Object.entries(outputs)) {
    console.log(`${key}=${value}`);
  }
}
