import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const normalizePath = new URL(
  "../../.github/actions/filter-util/normalize-filter-input.mjs",
  import.meta.url,
).href;
const previewPath = new URL(
  "../../.github/actions/parse-preview-command/main.mjs",
  import.meta.url,
).href;
const { normalizeFilterInput } = await import(normalizePath);
const { parsePreviewCommand, checkExistence } = await import(previewPath);

it.each([
  ["@repo/api", ["@repo/api"]],
  ["--filter @repo/api", ["@repo/api"]],
  ["[main]", ["[main]"]],
  ["...[abc...def]", ["...[abc...def]"]],
  ["[abc...def]", ["[abc...def]"]],
  ['["--filter=@repo/api", "@repo/web"]', ["@repo/api", "@repo/web"]],
  ["@repo/api\n@repo/web", ["@repo/api", "@repo/web"]],
  ["@repo/api,@repo/web", ["@repo/api", "@repo/web"]],
  ["@repo/api @repo/web", ["@repo/api", "@repo/web"]],
  ["[]", []],
])("normalizes %s without losing single filters", (input, expected) => {
  expect(normalizeFilterInput(input)).toEqual(expected);
});
it.each(["[null]", "[1]", '["unterminated"'])(
  "rejects malformed filters %s",
  (input) => {
    expect(() => normalizeFilterInput(input)).toThrow();
  },
);
it("parses only exact package picks and validates Turbo's actual listing shape", () => {
  expect(
    parsePreviewCommand("/preview @repo/api\n@repo/web @repo/api"),
  ).toEqual(["@repo/api", "@repo/web"]);
  for (const body of [
    "/preview",
    "/previewed api",
    "/preview *",
    "/preview ...api",
    "/preview --filter=api",
  ]) {
    expect(() => parsePreviewCommand(body)).toThrow();
  }
  expect(
    checkExistence(["api"], { packages: { items: [{ name: "api" }] } }),
  ).toEqual(["api"]);
  expect(() =>
    checkExistence(["missing"], { packages: { items: [{ name: "api" }] } }),
  ).toThrow("Unknown packages");
  expect(() => checkExistence(["api"], [])).toThrow("Invalid Turbo");
});
function refine(filter: string, dependents = false) {
  const temp = mkdtempSync(join(tmpdir(), "refine-action-"));
  try {
    const output = join(temp, "outputs");
    execFileSync(
      process.execPath,
      [".github/actions/filter-util/filter-util.mjs"],
      {
        cwd: root,
        env: {
          ...process.env,
          INPUT_TASK: "deploy",
          INPUT_FILTER: filter,
          INPUT_DEPENDENTS: String(dependents),
          GITHUB_OUTPUT: output,
        },
        stdio: "pipe",
      },
    );
    return Object.fromEntries(
      readFileSync(output, "utf8")
        .trim()
        .split("\n")
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index), line.slice(index + 1)];
        }),
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
it("keeps an explicit empty selection empty, and does not redeploy dependents of a selected target", () => {
  const empty = refine("[]");
  expect(empty.has_hit).toBe("false");
  expect(JSON.parse(empty.packages!)).toEqual([]);
  const selected = refine("@repo/dummy-preview-api");
  expect(selected.has_hit).toBe("true");
  expect(JSON.parse(selected.direct_args!)).toEqual([
    "--filter=@repo/dummy-preview-api",
  ]);
  expect(JSON.parse(selected.deps_args!)).toEqual([
    "--filter=@repo/dummy-preview-api...",
  ]);
  const scriptOnly = refine("@repo/scripts");
  expect(scriptOnly.has_hit).toBe("false");
  expect(JSON.parse(scriptOnly.input_packages!)).toEqual(["@repo/scripts"]);
});
it("connects picked packages to preview metadata and deployable targets, preserving empty selections", async () => {
  const { planPreview } = await import(
    new URL("../../.github/actions/preview-deploy/plan.mjs", import.meta.url)
      .href
  );
  const picked = parsePreviewCommand("/preview @repo/dummy-preview-api");
  const sources = JSON.parse(
    refine(JSON.stringify(picked), true).input_packages!,
  );
  expect(sources).toContain("@repo/dummy-preview-web");
  const selected = planPreview(sources, picked);
  expect(selected.targets).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        package: picked[0],
        workerName: expect.any(String),
        path: expect.any(String),
      }),
    ]),
  );
  expect(
    JSON.parse(refine(JSON.stringify(selected.packages)).packages!),
  ).toContain(picked[0]);
  const taskless = planPreview(["@repo/scripts"], ["@repo/scripts"]);
  expect(taskless.packages).toContain("@repo/scripts");
  expect(refine(JSON.stringify(taskless.packages)).has_hit).toBe("false");
  expect(planPreview([], [])).toEqual({ packages: [], targets: [] });
});
