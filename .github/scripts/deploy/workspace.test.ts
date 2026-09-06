import { expect, it } from "vitest";
import { normalizeWorkspace, validatePicks } from "./workspace.js";
const packages = [{ package: "@repo/api", path: "apps/api" }];
it("normalizes actual Turbo 2.10.12 format", () =>
  expect(
    normalizeWorkspace({
      packages: { items: [{ name: "@repo/api", path: "apps/api" }] },
    }),
  ).toEqual(packages));
it("distinguishes empty output from malformed output", () => {
  expect(normalizeWorkspace({ packages: { items: [] } })).toEqual([]);
  expect(() => normalizeWorkspace({})).toThrow();
});
it("rejects filter expressions and proposes valid subset", () =>
  expect(() => validatePicks(["@repo/api", "...@repo/api"], packages)).toThrow(
    "Try: /preview @repo/api",
  ));
it("deduplicates exact names", () =>
  expect(validatePicks(["@repo/api", "@repo/api"], packages)).toEqual([
    "@repo/api",
  ]));
it("rejects empty manual input", () =>
  expect(() => validatePicks([], packages)).toThrow("Usage"));
