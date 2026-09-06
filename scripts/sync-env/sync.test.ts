import { afterEach, expect, it, vi } from "vitest";
import {
  cpSync,
  symlinkSync,
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
const packageDirectory = fileURLToPath(
  new URL("../../packages/app-config/", import.meta.url),
);
const state = vi.hoisted(() => ({ file: new URL("file:///tmp/unused") }));
vi.mock("@repo/app-config/global", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@repo/app-config/global")>()),
  get globalFile() {
    return state.file;
  },
}));
vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
import { sync } from "./sync.js";
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
  // CLIを隔離した配置で実行し、本番と同じ相対位置から共有設定を読む。
  const configDirectory = join(root, "app-config");
  cpSync(join(packageDirectory, "bin"), join(configDirectory, "bin"), {
    recursive: true,
  });
  writeFileSync(join(configDirectory, "package.json"), '{"type":"module"}');
  symlinkSync(
    join(packageDirectory, "node_modules"),
    join(configDirectory, "node_modules"),
    "dir",
  );
  const cli = join(configDirectory, "bin/sync-local.js");
  state.file = new URL(
    "file://" + join(configDirectory, "globalRuntimeEnvs.yaml"),
  );
  writeFileSync(state.file, "local:\n  KEEP: new\n  OLD: null\n");
  vi.mocked(execFileSync).mockImplementation((_command, args) => {
    for (const name of ["a", "b"]) {
      const manifest = JSON.parse(
        readFileSync(join(root, "apps", name, "package.json"), "utf8"),
      );
      if (!manifest.scripts?.["sync:local"]) continue;
      executeCli(
        process.execPath,
        [cli, ...(args?.includes("--dry-run") ? ["--dry-run"] : [])],
        { cwd: join(root, "apps", name), stdio: "pipe" },
      );
    }
    return "";
  });
  return root;
}
it("removes tombstones from all native files before consuming them", () => {
  const root = fixture();
  sync(root, false);
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
  sync(root, true);
  expect(readFileSync(join(root, "apps/a/.env.development"), "utf8")).toContain(
    "VITE_OLD=old",
  );
  expect(readFileSync(state.file, "utf8")).toContain("OLD");
});
it("retains tombstones if any native write fails", () => {
  const root = fixture();
  rmSync(join(root, "apps/b/.env.development"));
  mkdirSync(join(root, "apps/b/.env.development"));
  expect(() => sync(root, false)).toThrow();
  expect(readFileSync(state.file, "utf8")).toContain("OLD");
});

it("leaves unregistered packages untouched and consumes tombstones after registered tasks succeed", () => {
  const root = fixture();
  writeFileSync(
    join(root, "apps/b/package.json"),
    JSON.stringify({ name: "b" }),
  );
  sync(root, false);
  expect(
    readFileSync(join(root, "apps/a/.env.development"), "utf8"),
  ).not.toContain("VITE_OLD");
  expect(readFileSync(join(root, "apps/b/.env.development"), "utf8")).toContain(
    "VITE_OLD=old",
  );
  expect(readFileSync(state.file, "utf8")).not.toContain("OLD");
});
