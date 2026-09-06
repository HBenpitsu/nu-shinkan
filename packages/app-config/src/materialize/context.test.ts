import { describe, expect, it } from "vitest";
import { parseContext } from "./context.js";
describe("deployment context", () => {
  it.each([undefined, "local", "unknown"])("rejects channel %s", (channel) =>
    expect(() =>
      parseContext({ DEPLOY_CHANNEL: channel, TARGETS: "[]" }),
    ).toThrow(),
  );
  it.each(["0", "-1", "1.5", "NaN", "", "9007199254740992"])(
    "rejects PR %s",
    (pr) =>
      expect(() =>
        parseContext({
          DEPLOY_CHANNEL: "preview",
          PR_NUMBER: pr,
          TARGETS: "[]",
        }),
      ).toThrow(),
  );
  it.each([
    undefined,
    "api,web",
    '["api"]',
    '[{"package":"api","path":"../secret"}]',
  ])("rejects TARGETS %s", (targets) =>
    expect(() =>
      parseContext({ DEPLOY_CHANNEL: "staging", TARGETS: targets }),
    ).toThrow(),
  );
  it("accepts empty targets and update sentinel", () =>
    expect(
      parseContext({
        DEPLOY_CHANNEL: "release",
        PR_NUMBER: "-1",
        TARGETS: "[]",
      }),
    ).toEqual({
      channel: "release",
      prNumber: -1,
      targets: new Map(),
      profile: "release",
    }));
});

it("parses Worker names from the supplied environment", () => {
  const context = parseContext({
    DEPLOY_CHANNEL: "preview",
    PR_NUMBER: "42",
    TARGETS: JSON.stringify([{ package: "api", path: "apps/api" }]),
    WORKER_NAMES: '{"api":"bare-api"}',
  });
  expect(context.targets.get("api")).toEqual({
    path: "apps/api",
    workerName: "bare-api",
  });
});

it.each([
  "null",
  "[]",
  '{"api":42}',
  '{"api":""}',
  '{"api":null}',
  "true",
  "invalid JSON",
])("rejects invalid Worker metadata %s", (value) => {
  expect(() =>
    parseContext({
      DEPLOY_CHANNEL: "preview",
      PR_NUMBER: "1",
      TARGETS: "[]",
      WORKER_NAMES: value,
    }),
  ).toThrow();
});

it.each([
  ["preview", "staging"],
  ["staging", "staging"],
  ["release", "release"],
])("resolves profile for %s", (channel, profile) => {
  expect(
    parseContext({ DEPLOY_CHANNEL: channel, PR_NUMBER: "42", TARGETS: "[]" }),
  ).toMatchObject({ profile });
});

it("keeps non-Worker targets and excludes unselected Worker metadata", () => {
  const context = parseContext({
    DEPLOY_CHANNEL: "staging",
    TARGETS: JSON.stringify([{ package: "library", path: "packages/library" }]),
    WORKER_NAMES: JSON.stringify({ other: "other-worker" }),
  });
  expect([...context.targets]).toEqual([
    ["library", { path: "packages/library" }],
  ]);
});
