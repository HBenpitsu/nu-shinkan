import { afterEach, describe, expect, it, vi } from "vitest";
import { generateWranglerJsonc } from "./wrangler.js";
import {
  wranglerJsonc,
  type WranglerConfig,
} from "../config-file/wrangler.jsonc.js";
import { asDeployment } from "../config-file/deployment.yaml.js";
import type { Settings } from "./settings.js";
import { parseContext } from "./context.js";
const settings: Settings = {
  deployment: asDeployment({
    connections: { bindings: { API: "@repo/api", OTHER: "@repo/other" } },
  }),
  overrides: { ENV: "deployment" },
};
const context = parseContext({
  WORKER_NAMES: JSON.stringify({ "@repo/api": "api" }),
  DEPLOY_CHANNEL: "preview",
  PR_NUMBER: "42",
  TARGETS: JSON.stringify([{ package: "@repo/api", path: "apps/api" }]),
});

describe("Wrangler materialize", () => {
  it("preserves artifact paths and only redirects selected connections", () => {
    const result = materializeWrangler(
      {
        name: "web",
        main: "src/worker.ts",
        assets: { directory: "./dist" },
        routes: ["example.org"],
        vars: { ENV: "native" },
        env: {
          staging: {
            vars: { ENV: "profile" },
            services: [
              { binding: "API", service: "api" },
              { binding: "OTHER", service: "other" },
            ],
          },
        },
      },
      settings,
      context,
    );
    expect(result).toMatchObject({
      name: "web-preview-pr-42",
      main: "src/worker.ts",
      assets: { directory: "./dist" },
      vars: { ENV: "deployment" },
      services: [
        { binding: "API", service: "api-preview-pr-42" },
        { binding: "OTHER", service: "other-staging" },
      ],
    });
    expect(result).not.toHaveProperty("routes");
    expect(result).not.toHaveProperty("env");
  });
  it("keeps update routes and applies channel suffix once", () => {
    const result = materializeWrangler(
      {
        name: "web",
        routes: ["example.org"],
        services: [
          { binding: "API", service: "api" },
          { binding: "OTHER", service: "other" },
        ],
      },
      settings,
      parseContext({
        DEPLOY_CHANNEL: "release",
        TARGETS: JSON.stringify(
          [...context.targets].map(([packageName, target]) => ({
            package: packageName,
            path: target.path,
          })),
        ),
      }),
    );
    expect(result.name).toBe("web-release");
    expect(result.routes).toEqual(["example.org"]);
    expect(result.services?.[0]?.service).toBe("api-release");
  });
  it("rejects missing bindings", () =>
    expect(() =>
      materializeWrangler({ name: "web" }, settings, context),
    ).toThrow("Missing native binding"));
});

it("preserves native staging connections outside targets even if their declaration is unknown", () => {
  const result = materializeWrangler(
    {
      name: "web",
      services: [{ binding: "EXTERNAL", service: "shared-native" }],
    },
    {
      deployment: asDeployment({
        connections: { bindings: { EXTERNAL: "unknown-package" } },
      }),
      overrides: {},
    },
    context,
  );
  expect(result.services?.[0]?.service).toBe("shared-native-staging");
});

afterEach(() => vi.restoreAllMocks());

// ファイルI/Oだけを置き換え、公開入口を通して生成結果を検証する。
function materializeWrangler(
  original: WranglerConfig,
  settings: Parameters<typeof generateWranglerJsonc>[0],
  context: Parameters<typeof generateWranglerJsonc>[1],
): WranglerConfig {
  vi.spyOn(wranglerJsonc, "exists").mockReturnValue(true);
  vi.spyOn(wranglerJsonc, "read").mockReturnValue(original);
  const generate = vi
    .spyOn(wranglerJsonc, "generate")
    .mockImplementation(() => {});
  generate.mockClear();
  generateWranglerJsonc(settings, context);
  expect(generate).toHaveBeenCalledTimes(1);
  return generate.mock.calls[0]![0];
}
