import { expect, it } from "vitest";
import { asGlobalRuntimeEnvs } from "./globalRuntimeEnvs.yaml.js";
it("preserves local tombstones and normalizes scalars", () =>
  expect(
    asGlobalRuntimeEnvs({
      local: { OLD: null, PORT: 42 },
      staging: { ENABLED: true },
    }),
  ).toEqual({
    local: { OLD: null, PORT: "42" },
    staging: { ENABLED: "true" },
    release: {},
  }));
it("rejects null in deployment profiles", () =>
  expect(() => asGlobalRuntimeEnvs({ release: { KEY: null } })).toThrow());
