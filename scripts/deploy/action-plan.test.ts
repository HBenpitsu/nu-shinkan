import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { expect, it } from "vitest";
const root = resolve(import.meta.dirname, "../..");
const head = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: root,
  encoding: "utf8",
}).trim();
function select(mode: string, env: Record<string, string> = {}) {
  return spawnSync(
    "pnpm",
    ["exec", "tsx", `.github/actions/${mode}-deploy/plan.mjs`],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, HEAD_SHA: head, BASE_SHA: head, ...env },
    },
  );
}
it("update preserves empty comparison and falls back for missing base", () => {
  const empty = select("update");
  expect(empty.status, empty.stderr).toBe(0);
  expect(JSON.parse(empty.stdout)).toEqual({ changes: [], targets: [] });
  const fallback = select("update", { BASE_SHA: "" });
  expect(fallback.status, fallback.stderr).toBe(0);
  expect(JSON.parse(fallback.stdout).targets.length).toBeGreaterThan(0);
  expect(fallback.stderr).toContain("using full selection");
}, 20000);
it("review propagates comparison errors and update rejects wrong checkout", () => {
  expect(select("review", { BASE_SHA: "" }).status).not.toBe(0);
  expect(select("update", { HEAD_SHA: "a".repeat(40) }).status).not.toBe(0);
}, 20000);
