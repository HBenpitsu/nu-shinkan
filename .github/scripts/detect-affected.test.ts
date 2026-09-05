import { describe, expect, it } from "vitest";
import {
  buildAffectedResult,
  buildTurboEnv,
  buildTurboArgs,
  collectMissedTasks,
} from "./detect-affected.js";

describe("detect affected", () => {
  it("should collect turbo tasks whose cache status is MISS", () => {
    const stdout = JSON.stringify({
      tasks: [
        { directory: "apps/web-app", cache: { status: "MISS" } },
        { directory: "apps/admin-app", cache: { status: "HIT" } },
        { directory: "scripts/sync-local", cache: { status: "MISS" } },
      ],
    });

    expect(collectMissedTasks(stdout)).toEqual([
      "apps/web-app",
      "scripts/sync-local",
    ]);
  });

  it("should split app and script outputs and print github output lines", () => {
    const affected = buildAffectedResult(
      ["apps/web-app"],
      ["apps/web-app", "scripts/sync-local"],
    );

    expect(affected).toEqual({
      apps: ["apps/web-app"],
      whole: ["apps/web-app", "scripts/sync-local"],
      scripts: ["scripts/sync-local"],
    });
  });

  it("should build turbo args for app-only affected detection", () => {
    expect(buildTurboArgs("apps")).toEqual([
      "--affected",
      "--filter=./apps/*",
      "--dry-run=json",
    ]);
  });

  it("should build turbo args for whole-repo affected detection", () => {
    expect(buildTurboArgs("whole")).toEqual(["--affected", "--dry-run=json"]);
  });
});

it("should build turbo env with explicit base and head", () => {
  expect(buildTurboEnv("base-sha", "head-sha")).toMatchObject({
    TURBO_SCM_BASE: "base-sha",
    TURBO_SCM_HEAD: "head-sha",
  });
});

it("should omit turbo head when not provided", () => {
  expect(buildTurboEnv("base-sha", "")).toMatchObject({
    TURBO_SCM_BASE: "base-sha",
  });
  expect(buildTurboEnv("base-sha", "").TURBO_SCM_HEAD).toBeUndefined();
});
