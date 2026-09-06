import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
function run(command: string, args: string[], input?: string) {
  return spawnSync(
    "pnpm",
    ["exec", "tsx", `scripts/connection-graph/${command}.ts`, ...args],
    { cwd: root, encoding: "utf8", input },
  );
}
it("builds JSON and selects from both a file and stdin", () => {
  const fixture = mkdtempSync(join(tmpdir(), "graph-cli-"));
  try {
    writeFileSync(join(fixture, "pnpm-workspace.yaml"), 'packages: ["apps/*"]');
    for (const name of ["api", "web"]) {
      mkdirSync(join(fixture, "apps", name), { recursive: true });
      writeFileSync(
        join(fixture, "apps", name, "package.json"),
        JSON.stringify({ name }),
      );
    }
    writeFileSync(
      join(fixture, "apps/web/deployment.yaml"),
      "reviewEntry: true\nconnections:\n  urls:\n    API: api\n",
    );
    const build = run("build", ["--root", fixture]);
    expect(build.status, build.stderr).toBe(0);
    const file = join(fixture, "graph.json");
    writeFileSync(file, build.stdout);
    for (const source of [file, "-"]) {
      const select = run("select", ["--graph", source, "api"], build.stdout);
      expect(select.status, select.stderr).toBe(0);
      expect(
        JSON.parse(select.stdout).map((p: { package: string }) => p.package),
      ).toEqual(["api", "web"]);
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
