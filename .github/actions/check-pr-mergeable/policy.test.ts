import { describe, expect, it } from "vitest";
import { checkMergeable } from "./policy.mjs";

const head = "a".repeat(40);
const eligible = {
  state: "OPEN",
  isDraft: false,
  isMergeQueueEnabled: false,
  mergeStateStatus: "CLEAN",
  headRefOid: head,
  baseRefName: "main",
};
describe("ordinary merge authorization", () => {
  it("returns the eligible PR target", () => {
    expect(checkMergeable(eligible)).toEqual({
      head_sha: head,
      base_ref: "main",
    });
  });

  it.each(["CLEAN", "HAS_HOOKS", "UNSTABLE"])(
    "delegates eligibility to GitHub's %s result",
    (mergeStateStatus) => {
      expect(checkMergeable({ ...eligible, mergeStateStatus }).head_sha).toBe(
        head,
      );
    },
  );

  it.each([
    "BLOCKED",
    "BEHIND",
    "DIRTY",
    "DRAFT",
    "UNKNOWN",
    "FUTURE_STATE",
    null,
    undefined,
  ])(
    "rejects %s even for an administrator and bypass-capable App",
    (mergeStateStatus) => {
      // Bypass and per-rule details have no authority over the aggregate state.
      expect(() =>
        checkMergeable({
          ...eligible,
          mergeStateStatus,
          viewerCanMergeAsAdmin: true,
          appCanBypass: true,
        }),
      ).toThrow("eligibility");
    },
  );

  it.each(["approval", "required status", "conversation resolution"])(
    "honors GitHub becoming blocked after a %s requirement changes",
    () => {
      expect(checkMergeable(eligible).head_sha).toBe(head);
      expect(() =>
        checkMergeable({ ...eligible, mergeStateStatus: "BLOCKED" }),
      ).toThrow();
    },
  );

  it.each([true, undefined, null])(
    "rejects enabled or unknown merge queue status %s",
    (isMergeQueueEnabled) => {
      expect(() =>
        checkMergeable({ ...eligible, isMergeQueueEnabled }),
      ).toThrow("merge queue");
    },
  );

  it.each([
    null,
    {},
    { ...eligible, state: "CLOSED" },
    { ...eligible, state: "MERGED" },
    { ...eligible, isDraft: true },
    { ...eligible, isDraft: undefined },
    { ...eligible, headRefOid: null },
    { ...eligible, headRefOid: "main" },
    { ...eligible, baseRefName: "" },
  ])("rejects unavailable or ineligible PR data %#", (pr) => {
    expect(() => checkMergeable(pr)).toThrow();
  });

  it("returns a fixed target from the validated snapshot, even if the PR later advances", () => {
    const snapshot = { ...eligible };
    const target = checkMergeable(snapshot);
    snapshot.headRefOid = "b".repeat(40);
    expect(target).toEqual({ head_sha: head, base_ref: "main" });
  });
});
