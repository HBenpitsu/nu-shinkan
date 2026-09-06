import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cwd, chdir } from "node:process";
import { getPackages, collectReports } from "./collect-ui_test-reports.js";

const originalCwd = cwd();
let testDir: string | undefined;

beforeAll(() => {
  // prepare smoky environment
  testDir = mkdtempSync(join(tmpdir(), "collect-ui-test-reports-"));
  chdir(testDir);
  mkdirSync("package");
  mkdirSync("package/playwright-report");
  mkdirSync("packages");
  mkdirSync("packages/A");
  mkdirSync("packages/A/playwright-report");
  mkdirSync("packages/B");
  mkdirSync("packages/B/playwright-report");
});
afterAll(() => {
  // clean up smoky environment
  chdir(originalCwd);
  if (testDir) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

describe("snippets collection", () => {
  it("yaml should be parsed", () => {
    expect(
      getPackages(
        `
packages:
  - package
  - packages/*
other: value
`,
      ),
    ).toEqual(["package", "packages/*"]);

    expect(
      getPackages(
        `
packages: {}
other: value
`,
      ),
    ).toEqual([]);

    expect(
      getPackages(
        `
packages: package
other: value
`,
      ),
    ).toEqual(["package"]);
  });
  it("should collect reports", () => {
    const reports: Array<{ src: string; dist: string }> = [];
    collectReports(["package", "packages/*"], (src, dist) => {
      reports.push({ src, dist });
    });
    expect(reports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: cwd() + "/package/playwright-report",
          dist: "ui_test-reports/package",
        }),
        expect.objectContaining({
          src: cwd() + "/packages/A/playwright-report",
          dist: "ui_test-reports/A",
        }),
        expect.objectContaining({
          src: cwd() + "/packages/B/playwright-report",
          dist: "ui_test-reports/B",
        }),
      ]),
    );
  });
});
