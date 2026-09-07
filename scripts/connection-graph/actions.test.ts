import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const normalizePath = new URL(
  "../../.github/actions/refine-filter/normalize-filter-input.mjs",
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
function refine(filter: string) {
  const temp = mkdtempSync(join(tmpdir(), "refine-action-"));
  try {
    const output = join(temp, "outputs");
    execFileSync(
      process.execPath,
      [".github/actions/refine-filter/refine-filter.mjs"],
      {
        cwd: root,
        env: {
          ...process.env,
          INPUT_TASK: "deploy",
          INPUT_FILTER: filter,
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
  expect(JSON.parse(selected.affected_args!)).toEqual([
    "--filter=@repo/dummy-preview-api",
  ]);
  expect(JSON.parse(selected.deps_args!)).toEqual([
    "--filter=@repo/dummy-preview-api...",
  ]);
  expect(refine("@repo/scripts").has_hit).toBe("false");
}, 20000);
it("passes graph output through stdin, including the empty case", () => {
  const graph = execFileSync(
    "pnpm",
    ["exec", "tsx", "scripts/connection-graph/build.ts"],
    { cwd: root, encoding: "utf8" },
  );
  const selected = spawnSync(
    "pnpm",
    [
      "exec",
      "tsx",
      "scripts/connection-graph/select.ts",
      "--graph",
      "-",
      "--",
      "@repo/dummy-preview-api",
    ],
    { cwd: root, encoding: "utf8", input: graph },
  );
  expect(selected.status, selected.stderr).toBe(0);
  expect(JSON.parse(selected.stdout)).toEqual([
    "@repo/dummy-preview-api",
    "@repo/dummy-preview-web",
  ]);
}, 20000);
