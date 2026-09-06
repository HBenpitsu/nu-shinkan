import { afterEach, expect, it, vi } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parse } from "jsonc-parser";
import { execFileSync } from "node:child_process";
const { execFileSync: executeCli } =
  await vi.importActual<typeof import("node:child_process")>(
    "node:child_process",
  );
const cli = fileURLToPath(
  new URL("../../packages/app-config/bin/sync-local.js", import.meta.url),
);
vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
import { syncLocal } from "./sync.js";
const state = { file: new URL("file:///tmp/unused") };
const roots: string[] = [];
afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "sync-local-"));
  roots.push(root);
  writeFileSync(join(root, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n");
  for (const name of ["a", "b"]) {
    const dir = join(root, "apps", name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name, scripts: { "sync:local": "sync-local" } }),
    );
    writeFileSync(
      join(dir, ".env.development"),
      "# keep comment\nVITE_OLD=old\nVITE_KEEP=old\nVITE_PRIVATE=value\n",
    );
    writeFileSync(
      join(dir, "wrangler.jsonc"),
      '{"name":"worker","vars":{"OLD":"old","KEEP":"old","PRIVATE":"value"}}',
    );
  }
  state.file = new URL("file://" + join(root, "global.yaml"));
  writeFileSync(state.file, "local:\n  KEEP: new\n  OLD: null\n");
  vi.mocked(execFileSync).mockImplementation((_command, args) => {
    for (const name of ["a", "b"])
      executeCli(
        process.execPath,
        [
          cli,
          "--global",
          fileURLToPath(state.file),
          ...(args?.includes("--dry-run") ? ["--dry-run"] : []),
        ],
        { cwd: join(root, "apps", name), stdio: "pipe" },
      );
    return "";
  });
  return root;
}
it("removes tombstones from all native files before consuming them", () => {
  const root = fixture();
  syncLocal(root, false, state.file);
  for (const name of ["a", "b"]) {
    const dir = join(root, "apps", name);
    const env = readFileSync(join(dir, ".env.development"), "utf8");
    expect(env).not.toContain("VITE_OLD");
    expect(env).toContain("VITE_PRIVATE=value");
    expect(env).toContain("# keep comment");
    expect(
      parse(readFileSync(join(dir, "wrangler.jsonc"), "utf8")).vars,
    ).toEqual({ KEEP: "new", PRIVATE: "value" });
  }
  expect(readFileSync(state.file, "utf8")).not.toContain("OLD");
});
it("dry-run leaves native files and tombstones intact", () => {
  const root = fixture();
  syncLocal(root, true, state.file);
  expect(readFileSync(join(root, "apps/a/.env.development"), "utf8")).toContain(
    "VITE_OLD=old",
  );
  expect(readFileSync(state.file, "utf8")).toContain("OLD");
});
it("retains tombstones if any native write fails", () => {
  const root = fixture();
  rmSync(join(root, "apps/b/.env.development"));
  mkdirSync(join(root, "apps/b/.env.development"));
  expect(() => syncLocal(root, false, state.file)).toThrow();
  expect(readFileSync(state.file, "utf8")).toContain("OLD");
});

it("keeps tombstones when a package has no sync task", () => {
  const root = fixture();
  writeFileSync(
    join(root, "apps/b/package.json"),
    JSON.stringify({ name: "b" }),
  );
  expect(() => syncLocal(root, false, state.file)).toThrow(
    "Missing sync:local",
  );
  expect(readFileSync(state.file, "utf8")).toContain("OLD");
});
