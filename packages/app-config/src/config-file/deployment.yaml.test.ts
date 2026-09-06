import { expect, it, vi } from "vitest";
import { asDeployment } from "./deployment.yaml.js";
it("defaults omitted fields", () =>
  expect(asDeployment({})).toEqual({
    envs: { staging: {}, release: {} },
    connections: { bindings: {}, urls: {} },
    reviewEntry: false,
  }));
it("warns for invalid reviewEntry", () => {
  const warn = vi.fn();
  expect(asDeployment({ reviewEntry: "true" }, warn).reviewEntry).toBe(false);
  expect(warn).toHaveBeenCalledOnce();
});
it("rejects malformed connection maps", () =>
  expect(() => asDeployment({ connections: { urls: [] } })).toThrow());

it("rejects non-string connection package names", () =>
  expect(() => asDeployment({ connections: { urls: { API: 42 } } })).toThrow(
    "expected package name",
  ));
