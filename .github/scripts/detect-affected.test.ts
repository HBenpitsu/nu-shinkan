import { describe, expect, it } from "vitest";
import { buildAffectedResult, collectMissedTasks } from "./detect-affected.js";

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
});
