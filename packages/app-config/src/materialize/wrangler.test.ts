import { describe, expect, it } from "vitest";
import { materializeWrangler } from "./wrangler.js";
import { parseDeployment } from "../config-file/deployment.yaml.js";
import type { Settings } from "./settings.js";
import type { Context } from "./context.js";
const settings: Settings = {
  deployment: parseDeployment({
    connections: { bindings: { API: "@repo/api", OTHER: "@repo/other" } },
  }),
  overrides: { ENV: "deployment" },
  workers: new Map([
    ["@repo/api", "api"],
    ["@repo/other", "other"],
  ]),
};
const context: Context = {
  channel: "preview",
  prNumber: 42,
  targets: [{ package: "@repo/api", path: "apps/api" }],
};
describe("Wrangler materialize", () => {
  it("rebases artifacts and only redirects selected connections", () => {
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
      main: "../src/worker.ts",
      assets: { directory: "../dist" },
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
      { ...context, channel: "release" },
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
      deployment: parseDeployment({
        connections: { bindings: { EXTERNAL: "unknown-package" } },
      }),
      overrides: {},
      workers: new Map(),
    },
    context,
  );
  expect(result.services?.[0]?.service).toBe("shared-native-staging");
});
