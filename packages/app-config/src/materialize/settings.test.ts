import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
vi.mock("../config-file/globalRuntimeEnvs.yaml.js", () => ({
  readGlobalRuntimeEnvs: () => ({
    staging: { SHARED: "global", GLOBAL: "staging" },
    release: { SHARED: "release global", GLOBAL: "release" },
  }),
}));
import { readSettings } from "./settings.js";
import { materializeWrangler } from "./wrangler.js";
const roots: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});
it.each(["staging", "release", "preview"] as const)(
  "applies all four priority levels in %s",
  (channel) => {
    const root = mkdtempSync(join(tmpdir(), "settings-"));
    roots.push(root);
    const app = join(root, "apps/api");
    mkdirSync(app, { recursive: true });
    writeFileSync(join(root, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n");
    writeFileSync(join(app, "package.json"), JSON.stringify({ name: "api" }));
    writeFileSync(
      join(app, "wrangler.jsonc"),
      JSON.stringify({ name: "bare-api" }),
    );
    writeFileSync(
      join(app, "deployment.yaml"),
      "envs:\n  staging:\n    SHARED: deployment staging\n    SELF: https://bare-api-staging.example/api/\n  release:\n    SHARED: deployment release\n    SELF: https://bare-api-release.example/api/\nconnections:\n  urls:\n    SELF: api\n",
    );
    vi.spyOn(process, "cwd").mockReturnValue(app);
    const context = {
      channel,
      prNumber: 42,
      targets: [{ package: "api", path: "apps/api" }],
    };
    const result = materializeWrangler(
      {
        name: "bare-api",
        vars: { SHARED: "native", GLOBAL: "native", NATIVE: "kept" },
      },
      readSettings(context),
      context,
    );
    expect(result.vars).toMatchObject({
      SHARED: `deployment ${channel === "release" ? "release" : "staging"}`,
      GLOBAL: channel === "release" ? "release" : "staging",
      NATIVE: "kept",
    });
    expect(result.vars?.SELF).toBe(
      channel === "preview"
        ? "https://bare-api-preview-pr-42.nushinkan2.workers.dev/api/"
        : `https://bare-api-${channel}.example/api/`,
    );
  },
);
