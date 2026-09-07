import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
function run(command: string, args: string[], input?: string, cwd = root) {
  return spawnSync(
    process.execPath,
    [
      join(root, "node_modules/tsx/dist/cli.mjs"),
      join(root, `scripts/connection-graph/${command}.ts`),
      ...args,
    ],
    { cwd, encoding: "utf8", input },
  );
}
it("builds JSON and selects from both a file and stdin", () => {
  const fixture = mkdtempSync(join(tmpdir(), "graph-cli-"));
  try {
    // Even a different workspace in cwd must not change the CLI's repository.
    writeFileSync(join(fixture, "pnpm-workspace.yaml"), "packages: []");
    const build = run("build", [], undefined, fixture);
    expect(build.status, build.stderr).toBe(0);
    const file = join(fixture, "graph.json");
    writeFileSync(file, build.stdout);
    for (const source of [file, "-"]) {
      const select = run(
        "select",
        ["--graph", source, "@repo/dummy-preview-api"],
        build.stdout,
      );
      expect(select.status, select.stderr).toBe(0);
      expect(JSON.parse(select.stdout)).toEqual([
        "@repo/dummy-preview-api",
        "@repo/dummy-preview-web",
      ]);
    }
    expect(JSON.parse(run("select", ["--graph", file]).stdout)).toEqual([]);
    const unknown = run("select", ["--graph", file, "missing"]);
    expect(unknown.status).toBe(1);
    expect(unknown.stdout).toBe("");
    expect(unknown.stderr).toContain("Unknown packages");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}, 20000);
it.each(["{}", "null", "not json"])(
  "rejects invalid graph input %s",
  (input) => {
    const result = run("select", ["--graph", "-"], input);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).not.toBe("");
  },
);

it("rejects root overrides instead of silently changing the target workspace", () => {
  const result = run("build", ["--root", root]);
  expect(result.status).toBe(1);
  expect(result.stdout).toBe("");
  expect(result.stderr).toContain("--root");
});
