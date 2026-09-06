import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { parseDeployment } from "@repo/app-config/deployment";
import {
  buildConnectionGraph,
  buildWorkspaceConnectionGraph,
} from "./graph.js";
import { selectReviewTargets } from "./graph.js";

it("selects every entry path, including cycles, but not unrelated dependencies", () => {
  const names = ["api", "a", "b", "web", "other", "batch", "orphan"];
  const graph = buildConnectionGraph(
    names.map((packageName) => ({ package: packageName, path: packageName })),
    new Map([
      [
        "api",
        parseDeployment({
          connections: { urls: { SELF: "api", X: "missing" } },
        }),
      ],
      ["a", parseDeployment({ connections: { urls: { API: "api", B: "b" } } })],
      ["b", parseDeployment({ connections: { bindings: { A: "a" } } })],
      [
        "web",
        parseDeployment({
          reviewEntry: true,
          connections: {
            bindings: { A: "a", B: "b" },
            urls: { A: "a", OTHER: "other" },
          },
        }),
      ],
      ["batch", parseDeployment({ connections: { urls: { API: "api" } } })],
    ]),
  );
  expect(
    graph.edges.filter(([from, to]) => from === "a" && to === "web"),
  ).toHaveLength(1);
  expect(graph.edges).not.toContainEqual(["api", "api"]);
  expect(graph.edges).not.toContainEqual(["missing", "api"]);
  expect(
    selectReviewTargets(graph, ["api", "orphan", "api"]).map((p) => p.package),
  ).toEqual(["api", "a", "b", "web"]);
  expect(selectReviewTargets(graph, ["web"]).map((p) => p.package)).toEqual([
    "web",
  ]);
  expect(selectReviewTargets(graph, [])).toEqual([]);
  expect(selectReviewTargets(graph, ["orphan", "unknown"])).toEqual([]);
  expect(selectReviewTargets({ ...graph, reviewEntries: [] }, names)).toEqual(
    [],
  );
  expect(
    selectReviewTargets(JSON.parse(JSON.stringify(graph)), ["api"]),
  ).toEqual(selectReviewTargets(graph, ["api"]));
});

it("reads workspace configuration, missing deployment files, and exclusions", () => {
  const root = mkdtempSync(join(tmpdir(), "connection-graph-"));
  try {
    writeFileSync(
      join(root, "pnpm-workspace.yaml"),
      'packages:\n  - "apps/*"\n  - "!apps/excluded"\n',
    );
    for (const name of ["api", "web", "shared", "excluded"]) {
      mkdirSync(join(root, "apps", name), { recursive: true });
      writeFileSync(
        join(root, "apps", name, "package.json"),
        JSON.stringify({ name }),
      );
    }
    writeFileSync(
      join(root, "apps/web/deployment.yaml"),
      "reviewEntry: true\nconnections:\n  urls:\n    API: api\n",
    );
    const graph = buildWorkspaceConnectionGraph(root);
    expect(graph.packages.map((p) => p.package)).toEqual([
      "api",
      "shared",
      "web",
    ]);
    expect(selectReviewTargets(graph, ["api"]).map((p) => p.package)).toEqual([
      "api",
      "web",
    ]);
    writeFileSync(
      join(root, "apps/web/deployment.yaml"),
      "connections:\n  urls: []\n",
    );
    expect(() => buildWorkspaceConnectionGraph(root)).toThrow(
      "expected mapping",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

it("handles long paths without recursive stack overflow", () => {
  const packages = Array.from({ length: 20000 }, (_, i) => ({
    package: String(i),
    path: String(i),
  }));
  const edges: [string, string][] = packages
    .slice(1)
    .map((p, i) => [String(i), p.package]);
  expect(
    selectReviewTargets({ packages, edges, reviewEntries: ["19999"] }, ["0"]),
  ).toHaveLength(20000);
});
