/**
 * stdoutはGITHUB_OUTPUTに書き込まれる．
 * このスクリプトは，stdoutへの出力によって以下の値を定める
 *
 * affected_apps, apps_affected, apps_filter_args,
 * affected_scripts, scripts_affected, scripts_filter_args,
 * all_affected, affected, affected_filter_args
 *
 * ビルド時環境変数として BASE_SHA と必要に応じて HEAD_SHA が提供される．
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

function main() {
  const base = env.BASE_SHA?.trim() ?? "";
  const head = env.HEAD_SHA?.trim() ?? "";
  const { apps, whole } = getAffected(base, head);
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

function getAffected(
  base: string,
  head: string,
): { apps: string[]; whole: string[] } {
  const result: { apps: string[]; whole: string[] } = { apps: [], whole: [] };

  if (!base || /^0+$/.test(base)) {
    return result;
  }

  try {
    const appsStdout = execTurboDryRun(
      "deploy",
      buildTurboArgs("apps"),
      buildTurboEnv(base, head),
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
    const wholeStdout = execTurboDryRun(
      "dev",
      buildTurboArgs("whole"),
      buildTurboEnv(base, head),
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

export function buildTurboArgs(scope: "apps" | "whole"): string[] {
  const args = ["--affected", "--dry-run=json"];

  if (scope === "apps") {
    args.splice(1, 0, "--filter=./apps/*");
  }

  return args;
}

export function buildTurboEnv(base: string, head: string): NodeJS.ProcessEnv {
  return {
    ...env,
    TURBO_SCM_BASE: base,
    ...(head ? { TURBO_SCM_HEAD: head } : {}),
  };
}

function execTurboDryRun(
  task: string,
  args: string[],
  turboEnv: NodeJS.ProcessEnv,
): string {
  return execFileSync("pnpm", ["turbo", "run", task, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: turboEnv,
  });
}

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

function writeGitHubOutput(outputs: Record<string, singlevalue>): void {
  for (const [key, value] of Object.entries(outputs)) {
    process.stdout.write(`${key}=${value}\n`);
  }
}

if (env.VITEST !== "true") {
  main();
}
