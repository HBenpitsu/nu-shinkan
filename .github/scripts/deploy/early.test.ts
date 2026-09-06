import { afterEach, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const roots: string[] = [];
afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots.length = 0;
});
it("rejects unknown manual names and replies without any dependency install", () => {
  const root = mkdtempSync(join(tmpdir(), "preview-early-"));
  roots.push(root);
  mkdirSync(join(root, "apps/api"), { recursive: true });
  writeFileSync(join(root, "pnpm-workspace.yaml"), 'packages:\n  - "apps/*"\n');
  writeFileSync(
    join(root, "apps/api/package.json"),
    JSON.stringify({ name: "@repo/api" }),
  );
  const preload = join(root, "mock.mjs");
  writeFileSync(
    preload,
    `import{writeFileSync}from'node:fs';globalThis.fetch=async(url,options)=>{if(url.endsWith('/pulls/12'))return Response.json({state:'open'});if(url.endsWith('/issues/12/comments')){writeFileSync('comment.json',options.body);return Response.json({id:1});}throw Error('Unexpected network call '+url);};`,
  );
  const start = Date.now();
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      preload,
      fileURLToPath(new URL("./early.mjs", import.meta.url)),
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        GITHUB_OUTPUT: join(root, "output"),
        GITHUB_TOKEN: "fixture",
        GITHUB_REPOSITORY: "org/repo",
        GITHUB_RUN_ID: "123",
        PR_NUMBER: "12",
        HEAD_SHA: "a".repeat(40),
        SELECTION_SOURCE: "manual-pick",
        PICKS: '["@repo/api","unknown"]',
      },
      encoding: "utf8",
    },
  );
  expect(result.status, result.stderr).toBe(1);
  expect(Date.now() - start).toBeLessThan(20000);
  expect(
    JSON.parse(readFileSync(join(root, "comment.json"), "utf8")).body,
  ).toContain("Try: /preview @repo/api");
  expect(
    JSON.parse(
      readFileSync(join(root, ".artifacts/deploy/result.json"), "utf8"),
    ).phase,
  ).toBe("input");
});
