import { afterEach, expect, it, vi } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import {
  GlobalRuntimeEnvsYaml,
  testExports,
} from "./globalRuntimeEnvs.yaml.js";
it("preserves local tombstones and normalizes scalars", () =>
  expect(
    testExports.asGlobalRuntimeEnvs({
      local: { OLD: null, PORT: 42 },
      staging: { ENABLED: true },
    }),
  ).toEqual({
    local: { OLD: null, PORT: "42" },
    staging: { ENABLED: "true" },
    release: {},
  }));
it("rejects null in deployment profiles", () =>
  expect(() =>
    testExports.asGlobalRuntimeEnvs({ release: { KEY: null } }),
  ).toThrow());

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

afterEach(() => vi.restoreAllMocks());

it("reads and saves the shared file independently of cwd", () => {
  vi.spyOn(process, "cwd").mockReturnValue("/unrelated/package");
  vi.mocked(readFileSync).mockReturnValue(
    "# keep\nlocal:\n  OLD: null\n  KEEP: value\nstaging:\n  PORT: 42\n",
  );
  vi.mocked(writeFileSync).mockClear();
  const global = new GlobalRuntimeEnvsYaml();
  const file = new URL("../../globalRuntimeEnvs.yaml", import.meta.url);
  expect(global.local).toEqual({ OLD: null, KEEP: "value" });
  expect(readFileSync).toHaveBeenCalledWith(file, "utf8");
  expect(global.variablesFor("staging")).toEqual({ PORT: "42" });
  global.local.KEEP = "changed";
  expect(global.local.KEEP).toBe("value");
  global.removeNull();
  expect(global.local).toEqual({ KEEP: "value" });
  expect(writeFileSync).not.toHaveBeenCalled();
  global.save();
  expect(writeFileSync).toHaveBeenCalledWith(
    file,
    expect.stringContaining("# keep"),
    "utf8",
  );
  expect(vi.mocked(writeFileSync).mock.calls[0]![1]).not.toContain("OLD");
});
