import { describe, expect, it } from "vitest";
import {
  commandAuthor as identifyAuthor,
  requireWritePermission,
} from "./policy.mjs";
const commandAuthor = (eventName, payload) =>
  identifyAuthor(eventName, payload, "/merge-ff");
const command = {
  action: "created",
  issue: { number: 42, pull_request: {} },
  comment: { body: "/merge-ff", user: { login: "comment-author" } },
};

describe("PR command boundary", () => {
  it("uses the comment author, not a rerun actor or the PR author", () => {
    expect(
      commandAuthor("issue_comment", {
        ...command,
        sender: { login: "someone-else" },
      }),
    ).toBe("comment-author");
  });
  it("allows surrounding whitespace", () => {
    expect(
      commandAuthor("issue_comment", {
        ...command,
        comment: { ...command.comment, body: " /merge-ff\n" },
      }),
    ).toBe("comment-author");
  });
  it.each([
    "/merge-ff-extra",
    "/merge-ff please",
    "text /merge-ff",
    "`/merge-ff`",
    "/merge-ff\nmore",
    "",
  ])("rejects non-command %s", (body) => {
    expect(() =>
      commandAuthor("issue_comment", {
        ...command,
        comment: { ...command.comment, body },
      }),
    ).toThrow();
  });
  it("rejects ordinary issues, edited comments, other events and missing authors", () => {
    for (const payload of [
      { ...command, issue: { number: 42 } },
      { ...command, action: "edited" },
      { ...command, comment: { body: "/merge-ff" } },
      undefined,
    ])
      expect(() => commandAuthor("issue_comment", payload)).toThrow();
    expect(() => commandAuthor("pull_request", command)).toThrow();
  });
});

it.each(["write", "maintain", "admin"])(
  "accepts effective %s permission",
  (permission) => {
    expect(() => requireWritePermission(permission)).not.toThrow();
  },
);
it.each(["read", "triage", "none", "custom-role-name", undefined, null])(
  "rejects insufficient or unknown %s permission",
  (permission) => {
    expect(() => requireWritePermission(permission)).toThrow("permission");
  },
);
it("uses the configured command rather than a merge-specific command", () => {
  const payload = {
    ...command,
    comment: { ...command.comment, body: "/rebuild" },
  };
  expect(identifyAuthor("issue_comment", payload, "/rebuild")).toBe(
    "comment-author",
  );
  expect(() => identifyAuthor("issue_comment", payload, "/merge-ff")).toThrow();
  for (const invalid of ["", undefined, "/rebuild extra", "rebuild"]) {
    expect(() => identifyAuthor("issue_comment", payload, invalid)).toThrow();
  }
});
