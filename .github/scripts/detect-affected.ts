/**
 * stdoutはGITHUB_OUTPUTに書き込まれる．
 * このスクリプトは，stdoutへの出力によって以下の値を定める
 *
 * affected_apps, apps_affected, apps_filter_args,
 * affected_scripts, scripts_affected, scripts_filter_args,
 * all_affected, affected, affected_filter_args
 *
 * ビルド時環境変数として BASE_SHA が提供される．
 */

import { execFileSync } from "node:child_process";
import { env } from "node:process";

type singlevalue = string | number | boolean | null;

export type TurboTask = {
  directory?: string;
  cache?: { status?: string };
};

export type TurboJson = {
  tasks?: TurboTask[];
};

export function collectMissedTasks(stdout: string): string[] {
  const parsed = JSON.parse(stdout) as TurboJson;

  return (parsed.tasks ?? [])
    .filter(
      (task) =>
        typeof task.directory === "string" && task.cache?.status === "MISS",
    )
    .map((task) => task.directory as string)
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort();
}

export function buildAffectedResult(
  apps: string[],
  whole: string[],
): { apps: string[]; whole: string[]; scripts: string[] } {
  return {
    apps,
    whole,
    scripts: whole.filter((value) => !apps.includes(value)),
  };
}

export function serializeGitHubOutput(
  outputs: Record<string, singlevalue>,
): string[] {
  return Object.entries(outputs).map(([key, value]) => `${key}=${value}`);
}

function writeGitHubOutput(outputs: Record<string, singlevalue>): void {
  for (const line of serializeGitHubOutput(outputs)) {
    process.stdout.write(`${line}\n`);
  }
}

function main() {
  const base = env.BASE_SHA?.trim() ?? "";
  const { apps, whole } = getAffected(base);
  const affected = buildAffectedResult(apps, whole);

  writeGitHubOutput({
    affected_apps: JSON.stringify(affected.apps),
    apps_affected: affected.apps.length > 0,
    apps_filter_args: affected.apps
      .map((app) => `--filter="./${app}"`)
      .join(" "),
    affected_scripts: JSON.stringify(affected.scripts),
    scripts_affected: affected.scripts.length > 0,
    scripts_filter_args: affected.scripts
      .map((script) => `--filter="./${script}"`)
      .join(" "),
    all_affected: JSON.stringify(affected.whole),
    affected: affected.whole.length > 0,
    affected_filter_args: affected.whole
      .map((item) => `--filter="./${item}"`)
      .join(" "),
  });
}

if (env.VITEST !== "true") {
  main();
}

function getAffected(base: string): { apps: string[]; whole: string[] } {
  const result: { apps: string[]; whole: string[] } = { apps: [], whole: [] };

  if (!base || /^0+$/.test(base)) {
    return result;
  }

  try {
    const appsStdout = execFileSync(
      "pnpm",
      [
        "turbo",
        "run",
        "deploy:preview",
        "--filter=./apps/*",
        `--filter=[${base}]`,
        "--dry-run=json",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    result.apps = collectMissedTasks(appsStdout).filter((value) =>
      value.startsWith("apps/"),
    );
  } catch (error) {
    console.warn(
      `Turbo app detection failed for BASE_SHA=${base}. Falling back to empty result.`,
    );
    if (error instanceof Error) {
      console.warn(error.message);
    }
  }

  try {
    const wholeStdout = execFileSync(
      "pnpm",
      ["turbo", "run", "dev", `--filter=[${base}]`, "--dry-run=json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    result.whole = collectMissedTasks(wholeStdout);
  } catch (error) {
    console.warn(
      `Turbo whole-project detection failed for BASE_SHA=${base}. Falling back to empty result.`,
    );
    if (error instanceof Error) {
      console.warn(error.message);
    }
  }

  return result;
}
