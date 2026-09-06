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
    ).toEqual({ channel: "release", prNumber: -1, targets: [] }));
});
