import {
  existsSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { resultFor, type Summary } from "./results.js";
import type { Package } from "./workspace.js";
export function taskArgs(
  task: string,
  packages: Package[],
): string[] | undefined {
  return packages.length
    ? [
        "exec",
        "turbo",
        "run",
        task,
        "--only",
        ...packages.map((p) => `--filter=${p.package}`),
      ]
    : undefined;
}
export function runTask(
  task: string,
  packages: Package[],
  extra: string[] = [],
): void {
  const args = taskArgs(task, packages);
  if (!args) return;
  const result = spawnSync("pnpm", [...args, ...extra], { stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(
      `${task} failed (${result.status}): ${result.error ?? "see logs"}`,
    );
}
export function runDeploy(targets: Package[], manual: boolean) {
  mkdirSync(".artifacts/deploy", { recursive: true });
  const deployable = targets.filter(
    (p) =>
      typeof JSON.parse(readFileSync(join(p.path, "package.json"), "utf8"))
        .scripts?.deploy === "string",
  );
  if (manual && !deployable.length)
    throw new Error("No deployable targets for /preview");
  const before = new Set(
    existsSync(".turbo/runs") ? readdirSync(".turbo/runs") : [],
  );
  // Prevent an interrupted task from being associated with a previous run's log.
  for (const pkg of deployable)
    rmSync(join(pkg.path, ".turbo/turbo-deploy.log"), { force: true });
  const args = taskArgs("deploy", deployable);
  const execution = args
    ? spawnSync(
        "pnpm",
        [
          ...args,
          "--continue=always",
          "--concurrency=100%",
          "--summarize",
          "--output-logs=full",
        ],
        { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
      )
    : undefined;
  const output = `${execution?.stdout ?? ""}${execution?.stderr ?? ""}`;
  process.stdout.write(output);
  writeFileSync(".artifacts/deploy/turbo.log", output);
  const summaries = existsSync(".turbo/runs")
    ? readdirSync(".turbo/runs").filter(
        (f) => !before.has(f) && f.endsWith(".json"),
      )
    : [];
  let summary: Summary = {};
  if (summaries.length === 1) {
    const file = join(".turbo/runs", summaries[0]!);
    summary = JSON.parse(readFileSync(file, "utf8"));
    copyFileSync(file, ".artifacts/deploy/turbo-summary.json");
  }
  const results = targets.map((pkg, index) => {
    const logFile = join(pkg.path, ".turbo/turbo-deploy.log");
    const log =
      deployable.includes(pkg) && existsSync(logFile)
        ? readFileSync(logFile, "utf8")
        : "";
    writeFileSync(`.artifacts/deploy/${index}.log`, log);
    const configFile = join(pkg.path, "wrangler.deploy.jsonc");
    return resultFor(
      pkg,
      deployable.includes(pkg),
      summary,
      log,
      existsSync(configFile)
        ? JSON.parse(readFileSync(configFile, "utf8"))
        : undefined,
    );
  });
  return {
    results,
    failed:
      (execution !== undefined && execution.status !== 0) ||
      results.some((r) => r.status === "failure"),
  };
}
