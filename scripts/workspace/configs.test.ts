import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { afterEach, expect, it } from "vitest";
import { getWorkspaceConfigurations } from "./configs.js";
import { findWorkspaceRoot } from "./root.js";

const roots: string[] = [];
afterEach(() =>
  roots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true })),
);
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "workspace-configs-"));
  roots.push(root);
  writeFileSync(
    join(root, "pnpm-workspace.yaml"),
    'packages: ["apps/*", "!apps/excluded"]',
  );
  for (const name of ["api", "web", "excluded"]) {
    mkdirSync(join(root, "apps", name), { recursive: true });
    writeFileSync(
      join(root, "apps", name, "package.json"),
      JSON.stringify({ name }),
    );
  }
  writeFileSync(
    join(root, "apps/api/wrangler.jsonc"),
    '{/* native */ "name":"my-api","vars":{"FOO":"bar"}}',
  );
  writeFileSync(
    join(root, "apps/web/.env.development"),
    "PRIVATE=secret\nVITE_API=https://example.com\n",
  );
  return root;
}
function cli(root: string, ...args: string[]) {
  return spawnSync(
    "pnpm",
    [
      "exec",
      "tsx",
      "scripts/workspace/configs-cli.ts",
      "--root",
      root,
      ...args,
    ],
    {
      cwd: resolve(import.meta.dirname, "../.."),
      encoding: "utf8",
    },
  );
}
it("collects native config through public loaders and respects workspace exclusions", () => {
  const root = fixture();
  expect(findWorkspaceRoot(join(root, "apps/api"))).toBe(root);
  const configurations = getWorkspaceConfigurations(root);
  expect(configurations.map((pkg) => pkg.packageName)).toEqual(["api", "web"]);
  expect(configurations[0]?.wrangler?.name).toBe("my-api");
  expect(configurations[1]).toEqual({
    packageName: "web",
    path: join(root, "apps/web"),
    pathRel: "apps/web",
    dotenv: { API: "https://example.com" },
  });
});
it("serializes actual Wrangler data and only selected metadata for deployment", () => {
  const root = fixture();
  const listing = cli(root);
  expect(listing.status, listing.stderr).toBe(0);
  expect(JSON.parse(listing.stdout)[0].wrangler).toEqual({
    name: "my-api",
    vars: { FOO: "bar" },
  });
  const targets = cli(root, "--targets", "api");
  expect(targets.status, targets.stderr).toBe(0);
  expect(JSON.parse(targets.stdout)).toEqual([
    { package: "api", path: "apps/api", workerName: "my-api" },
  ]);
  expect(JSON.parse(cli(root, "--targets").stdout)).toEqual([]);
  expect(cli(root, "--targets", "unknown").status).toBe(1);
}, 20000);
it("rejects duplicate names and invalid Worker metadata instead of producing a partial plan", () => {
  const root = fixture();
  writeFileSync(join(root, "apps/api/wrangler.jsonc"), '{"vars":{}}');
  const invalid = cli(root, "--targets", "api");
  expect(invalid.status).toBe(1);
  expect(invalid.stdout).toBe("");
  writeFileSync(join(root, "apps/web/package.json"), '{"name":"api"}');
  expect(() => getWorkspaceConfigurations(root)).toThrow("Duplicate package");
});
