import { expect, it } from "vitest";
import { formatReport } from "./notify.js";
it("includes early-phase errors, SHA, package statuses and run URL", () => {
  const body = formatReport({
    repository: "org/repo",
    runId: "123",
    pr: 8,
    head: "abc",
    channel: "preview",
    phase: "test",
    changes: [],
    targets: [],
    results: [
      {
        package: "api",
        path: "apps/api",
        status: "failure",
        error: "bad | <tag>",
      },
    ],
    error: "test failed",
  });
  for (const text of [
    "abc",
    "Phase: test",
    "test failed",
    "api",
    "failure",
    "actions/runs/123",
  ])
    expect(body).toContain(text);
  expect(body).not.toContain("<tag>");
});
