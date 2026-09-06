import { expect, it, vi } from "vitest";
import { createPlan } from "./targets.js";
const api = { package: "api", path: "apps/api" },
  web = { package: "web", path: "apps/web" };
const all = [api, web];
it("keeps test scope and resolves metadata only for selected graph targets", () => {
  const deps = {
    reviewTargets: vi.fn(() => ["web"]),
    resolveWorkers: vi.fn((p) => p),
  };
  expect(createPlan(all, [api], all, true, deps)).toEqual({
    changes: ["api"],
    targets: [web],
  });
  expect(deps.reviewTargets).toHaveBeenCalledWith(["api", "web"]);
  expect(deps.resolveWorkers).toHaveBeenCalledWith([web]);
});
it("keeps empty selection empty and rejects unknown graph nodes", () => {
  const deps = {
    reviewTargets: vi.fn(() => ["unknown"]),
    resolveWorkers: vi.fn((p) => p),
  };
  expect(createPlan(all, [], [], false, deps)).toEqual({
    changes: [],
    targets: [],
  });
  expect(() => createPlan(all, [api], [api], true, deps)).toThrow(
    "Unknown graph target",
  );
});
