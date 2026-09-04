import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdirSync, existsSync, rmSync } from "fs";
import { cwd, chdir } from "node:process";
import { getPackages, collectReports } from "./collect-e2e-reports.js";

const originalCwd = cwd();

beforeAll(() => {
  // prepare smoky environment
  rmSync("test-smoky-environment", { recursive: true, force: true });
  mkdirSync("test-smoky-environment");
  chdir("test-smoky-environment");
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
  if (existsSync("test-smoky-environment")) {
    rmSync("test-smoky-environment", { recursive: true, force: true });
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
          dist: "e2e-reports/package",
        }),
        expect.objectContaining({
          src: cwd() + "/packages/A/playwright-report",
          dist: "e2e-reports/A",
        }),
        expect.objectContaining({
          src: cwd() + "/packages/B/playwright-report",
          dist: "e2e-reports/B",
        }),
      ]),
    );
  });
});
