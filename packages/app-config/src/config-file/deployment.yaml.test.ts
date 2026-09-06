import { expect, it, vi } from "vitest";
import { parseDeployment } from "./deployment.yaml.js";
it("defaults omitted fields", () =>
  expect(parseDeployment({})).toEqual({
    envs: { staging: {}, release: {} },
    connections: { bindings: {}, urls: {} },
    reviewEntry: false,
  }));
it("warns for invalid reviewEntry", () => {
  const warn = vi.fn();
  expect(parseDeployment({ reviewEntry: "true" }, warn).reviewEntry).toBe(
    false,
  );
  expect(warn).toHaveBeenCalledOnce();
});
it("rejects malformed connection maps", () =>
  expect(() => parseDeployment({ connections: { urls: [] } })).toThrow());

it("rejects non-string connection package names", () =>
  expect(() => parseDeployment({ connections: { urls: { API: 42 } } })).toThrow(
    "expected package name",
  ));
