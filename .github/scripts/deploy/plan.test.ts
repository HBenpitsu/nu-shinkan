import { expect, it, vi } from "vitest";
import { plan, type Request } from "./plan.js";
const api = { package: "api", path: "apps/api" },
  web = { package: "web", path: "apps/web" };
const all = [api, web];
const request: Request = {
  channel: "staging",
  source: "diff",
  head: "a".repeat(40),
  base: "b".repeat(40),
  picks: [],
};
function deps() {
  return {
    commit: vi.fn((x) => x),
    isAncestor: vi.fn(() => true),
    list: vi.fn((filters?: string[]) =>
      !filters ? all : filters[0]?.startsWith("...") ? all : [api],
    ),
    resolveWorkers: vi.fn((packages: typeof all) => packages),
    reviewTargets: vi.fn(() => all),
  };
}
it("separates direct changes from dependents", () =>
  expect(plan(request, deps())).toEqual({ changes: ["api"], targets: all }));
it.each(["missing", "compare", "rewind"])(
  "falls back to full for %s",
  (mode) => {
    const d = deps();
    if (mode === "compare")
      d.list.mockImplementation((filters) => {
        if (filters) throw Error("failed");
        return all;
      });
    if (mode === "rewind") d.isAncestor.mockReturnValue(false);
    expect(
      plan(
        { ...request, base: mode === "missing" ? undefined : request.base },
        d,
      ),
    ).toEqual({ changes: ["api", "web"], targets: all });
  },
);
it("does not turn empty successful comparison into full", () => {
  const d = deps();
  d.list.mockImplementation((filters) => (filters ? [] : all));
  expect(plan(request, d)).toEqual({ changes: [], targets: [] });
});
it("does not hide review comparison or target SHA errors", () => {
  const d = deps();
  d.commit.mockImplementation(() => {
    throw Error("bad SHA");
  });
  expect(() => plan({ ...request, channel: "preview" }, d)).toThrow();
  expect(() => plan({ ...request, source: "full" }, d)).toThrow();
});
it("manual picks test only named packages and expand graph through dependents", () => {
  const d = deps();
  expect(
    plan(
      { ...request, channel: "preview", source: "manual-pick", picks: ["api"] },
      d,
    ),
  ).toEqual({ changes: ["api"], targets: all });
  expect(d.list).toHaveBeenLastCalledWith(["...api"]);
});
it("full includes every workspace including templates", () =>
  expect(plan({ ...request, source: "full" }, deps())).toEqual({
    changes: ["api", "web"],
    targets: all,
  }));

it("adds Worker metadata to planned targets", () => {
  const d = deps();
  d.resolveWorkers.mockReturnValue([
    { ...api, workerName: "bare-api" } as typeof api,
  ]);
  expect(plan(request, d)).toEqual({
    changes: ["api"],
    targets: [{ ...api, workerName: "bare-api" }],
  });
  expect(d.resolveWorkers).toHaveBeenCalledWith(all);
});
it("does not turn Worker metadata failures into full fallback", () => {
  const d = deps();
  d.resolveWorkers.mockImplementation(() => {
    throw new Error("invalid Worker");
  });
  expect(() => plan(request, d)).toThrow("invalid Worker");
});
