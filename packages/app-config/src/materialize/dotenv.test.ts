import { expect, it } from "vitest";
import { previewVariables } from "./settings.js";
import { parseDeployment } from "../config-file/deployment.yaml.js";
it("preserves URL path/query and leaves connections outside targets unchanged", () => {
  const result = previewVariables(
    {
      API: "https://api-staging.example/api/v1/?x=1",
      OTHER: "https://other-staging.example/",
    },
    {
      deployment: parseDeployment({
        connections: { urls: { API: "api", OTHER: "other" } },
      }),
      overrides: {},
      workers: new Map([["api", "api"]]),
    },
    {
      channel: "preview",
      prNumber: 8,
      targets: [{ package: "api", path: "apps/api" }],
    },
  );
  expect(result.API).toBe(
    "https://api-preview-pr-8.nushinkan2.workers.dev/api/v1/?x=1",
  );
  expect(result.OTHER).toBe("https://other-staging.example/");
});
it("rejects a selected URL connection without a base URL", () =>
  expect(() =>
    previewVariables(
      {},
      {
        deployment: parseDeployment({ connections: { urls: { API: "api" } } }),
        overrides: {},
        workers: new Map([["api", "api"]]),
      },
      {
        channel: "preview",
        prNumber: 8,
        targets: [{ package: "api", path: "apps/api" }],
      },
    ),
  ).toThrow("Missing base URL"));
