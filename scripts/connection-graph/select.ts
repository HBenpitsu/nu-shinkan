import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { selectReviewTargets, type ConnectionGraph } from "./graph.js";

function parseGraph(value: unknown): ConnectionGraph {
  if (!value || typeof value !== "object")
    throw new Error("Invalid connection graph");
  const graph = value as ConnectionGraph;
  if (
    !Array.isArray(graph.packages) ||
    !graph.packages.every(
      (p) =>
        p &&
        typeof p.package === "string" &&
        p.package.length > 0 &&
        typeof p.path === "string",
    ) ||
    !Array.isArray(graph.edges) ||
    !graph.edges.every(
      (edge) =>
        Array.isArray(edge) &&
        edge.length === 2 &&
        edge.every((name) => typeof name === "string"),
    ) ||
    !Array.isArray(graph.reviewEntries) ||
    !graph.reviewEntries.every((name) => typeof name === "string")
  )
    throw new Error("Invalid connection graph");
  const names = new Set(graph.packages.map((p) => p.package));
  if (names.size !== graph.packages.length)
    throw new Error("Duplicate workspace package name");
  return graph;
}

try {
  const { values, positionals: sources } = parseArgs({
    allowPositionals: true,
    options: { graph: { type: "string" } },
  });
  if (!values.graph)
    throw new Error(
      "Usage: tsx scripts/connection-graph/select.ts --graph <file|-> [package-name ...]",
    );
  const graph = parseGraph(
    JSON.parse(readFileSync(values.graph === "-" ? 0 : values.graph, "utf8")),
  );
  const names = new Set(graph.packages.map((p) => p.package));
  const unknown = sources.filter((name) => !names.has(name));
  if (unknown.length)
    throw new Error(`Unknown packages: ${unknown.join(", ")}`);
  console.log(JSON.stringify(selectReviewTargets(graph, sources), null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
