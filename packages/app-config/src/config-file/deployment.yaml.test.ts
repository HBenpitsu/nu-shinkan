import { expect, it, vi } from "vitest";
import { testExports } from "./deployment.yaml.js";
it("defaults omitted fields", () =>
  expect(testExports.asDeployment({})).toEqual({
    envs: { staging: {}, release: {} },
    connections: { bindings: {}, urls: {} },
    reviewEntry: false,
  }));
it("warns for invalid reviewEntry", () => {
  const warn = vi.fn();
  expect(
    testExports.asDeployment({ reviewEntry: "true" }, warn).reviewEntry,
  ).toBe(false);
  expect(warn).toHaveBeenCalledOnce();
});
it("rejects malformed connection maps", () =>
  expect(() =>
    testExports.asDeployment({ connections: { urls: [] } }),
  ).toThrow());

it("rejects non-string connection package names", () =>
  expect(() =>
    testExports.asDeployment({ connections: { urls: { API: 42 } } }),
  ).toThrow("expected package name"));
