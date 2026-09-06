import { parseContext } from "./context.js";
import { expect, it } from "vitest";
import { resolvePreviewVariables } from "./connections.js";
import { asDeployment } from "../config-file/deployment.yaml.js";
it("preserves URL path/query and leaves connections outside targets unchanged", () => {
  const result = resolvePreviewVariables(
    {
      API: "https://api-staging.example/api/v1/?x=1",
      OTHER: "https://other-staging.example/",
    },
    {
      deployment: asDeployment({
        connections: { urls: { API: "api", OTHER: "other" } },
      }),
      overrides: {},
    },
    parseContext({
      WORKER_NAMES: JSON.stringify({ api: "api" }),
      DEPLOY_CHANNEL: "preview",
      PR_NUMBER: "8",
      TARGETS: JSON.stringify([{ package: "api", path: "apps/api" }]),
    }),
  );
  expect(result.API).toBe(
    "https://api-preview-pr-8.nushinkan2.workers.dev/api/v1/?x=1",
  );
  expect(result.OTHER).toBe("https://other-staging.example/");
});
it("rejects a selected URL connection without a base URL", () =>
  expect(() =>
    resolvePreviewVariables(
      {},
      {
        deployment: asDeployment({ connections: { urls: { API: "api" } } }),
        overrides: {},
      },
      parseContext({
        WORKER_NAMES: JSON.stringify({ api: "api" }),
        DEPLOY_CHANNEL: "preview",
        PR_NUMBER: "8",
        TARGETS: JSON.stringify([{ package: "api", path: "apps/api" }]),
      }),
    ),
  ).toThrow("Missing base URL"));
