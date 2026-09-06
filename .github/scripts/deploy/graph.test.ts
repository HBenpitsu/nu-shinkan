import { expect, it } from "vitest";
import { parseDeployment } from "@repo/app-config/deployment";
import { reviewTargets } from "./graph.js";
const packages = ["api", "a", "b", "web", "batch", "orphan"].map(
  (packageName) => ({ package: packageName, path: `apps/${packageName}` }),
);
function configs() {
  return new Map([
    [
      "api",
      parseDeployment({
        connections: { urls: { SELF: "api", UNKNOWN: "unknown" } },
      }),
    ],
    ["a", parseDeployment({ connections: { urls: { API: "api", B: "b" } } })],
    ["b", parseDeployment({ connections: { bindings: { A: "a" } } })],
    [
      "web",
      parseDeployment({
        reviewEntry: true,
        connections: { bindings: { A: "a" } },
      }),
    ],
    ["batch", parseDeployment({ connections: { urls: { API: "api" } } })],
  ]);
}
it("selects all paths including cycles but excludes branches without entries", () =>
  expect(
    reviewTargets(packages, configs(), [packages[0]!]).map((p) => p.package),
  ).toEqual(["api", "a", "b", "web"]));
it("includes zero-length paths", () =>
  expect(reviewTargets(packages, configs(), [packages[3]!])).toEqual([
    packages[3],
  ]));
it("handles empty starts and entry-less graphs", () => {
  expect(reviewTargets(packages, configs(), [])).toEqual([]);
  expect(reviewTargets(packages, new Map(), packages)).toEqual([]);
});
it("handles multiple roots and disconnected roots", () =>
  expect(
    reviewTargets(packages, configs(), [packages[0]!, packages[5]!]).map(
      (p) => p.package,
    ),
  ).toEqual(["api", "a", "b", "web"]));
