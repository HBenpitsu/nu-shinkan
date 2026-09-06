import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { collectWorkerNames } from "./workers.js";

it("validates targets and reads only selected Workers", () => {
  const root = mkdtempSync(join(tmpdir(), "worker-context-"));
  try {
    writeFileSync(join(root, "pnpm-workspace.yaml"), 'packages: ["apps/*"]');
    for (const name of ["api", "library", "unrelated"]) {
      mkdirSync(join(root, "apps", name), { recursive: true });
      writeFileSync(
        join(root, "apps", name, "package.json"),
        JSON.stringify({ name }),
      );
    }
    writeFileSync(
      join(root, "apps/api/wrangler.jsonc"),
      '{/* comment */"name":"bare-api"}',
    );
    writeFileSync(join(root, "apps/unrelated/wrangler.jsonc"), "invalid");
    const api = { package: "api", path: "apps/api" };
    expect(
      collectWorkerNames(
        [api, { package: "library", path: "apps/library" }],
        root,
      ),
    ).toEqual({ api: "bare-api" });
    expect(collectWorkerNames([], root)).toEqual({});
    expect(() =>
      collectWorkerNames([{ ...api, path: "apps/unrelated" }], root),
    ).toThrow("Invalid target");
    expect(() =>
      collectWorkerNames(
        [{ package: "unrelated", path: "apps/unrelated" }],
        root,
      ),
    ).toThrow("Invalid Worker config");
    expect(() => collectWorkerNames(null, root)).toThrow(
      "Expected target array",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
