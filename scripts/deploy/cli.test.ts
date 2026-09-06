import { spawnSync, execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, it } from "vitest";
const root = resolve(import.meta.dirname, "../..");
function run(command: string, input: unknown) {
  return spawnSync("pnpm", ["exec", "tsx", "scripts/deploy/cli.ts", command], {
    cwd: root,
    input: JSON.stringify(input),
    encoding: "utf8",
  });
}
it("plans the checkout through the JSON CLI without deploying", () => {
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const result = run("plan", {
    channel: "staging",
    source: "full",
    head,
    picks: [],
  });
  expect(result.status, result.stderr).toBe(0);
  const plan = JSON.parse(result.stdout);
  expect(plan.changes).toContain("@repo/dummy-preview-api");
  expect(plan.targets).toContainEqual({
    package: "@repo/dummy-preview-api",
    path: "apps/dummy-preview-api",
    workerName: "dummy-preview-api",
  });
}, 20000);
it("keeps empty tasks empty and rejects invalid requests", () => {
  const empty = run("task", { task: "test", packages: [] });
  expect(empty.status, empty.stderr).toBe(0);
  expect(JSON.parse(empty.stdout)).toEqual({ success: true });
  const invalid = run("task", { task: "deploy", packages: [] });
  expect(invalid.status).toBe(1);
  expect(invalid.stdout).toBe("");
}, 20000);
