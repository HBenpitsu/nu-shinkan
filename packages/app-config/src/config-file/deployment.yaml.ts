import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

import { asRecord, asVariables, type Variables } from "./parse.js";

export type { Variables } from "./parse.js";
export type Deployment = {
  envs: { staging: Variables; release: Variables };
  connections: { bindings: Variables; urls: Variables };
  reviewEntry: boolean;
};

// Main Logic

export function readDeploymentYaml(
  directory: string = process.cwd(),
): Deployment {
  const file = join(directory, "deployment.yaml");
  // 設定ファイルのない共有パッケージも、接続・環境変数なしとして扱う。
  return asDeployment(
    existsSync(file) ? (YAML.parse(readFileSync(file, "utf8")) ?? {}) : {},
  );
}

export function asDeployment(value: unknown, warn = console.warn): Deployment {
  const raw = asRecord(value, "deployment");
  const envs = asRecord(raw.envs, "envs");
  const connections = asRecord(raw.connections, "connections");
  if (raw.reviewEntry !== undefined && typeof raw.reviewEntry !== "boolean")
    warn("Invalid reviewEntry; using false");
  return {
    envs: {
      staging: asVariables(envs.staging, "envs.staging"),
      release: asVariables(envs.release, "envs.release"),
    },
    connections: {
      bindings: asReferences(connections.bindings, "connections.bindings"),
      urls: asReferences(connections.urls, "connections.urls"),
    },
    reviewEntry: raw.reviewEntry === true,
  };
}

// Helper

function asReferences(value: unknown, label: string): Variables {
  const result = asRecord(value, label);
  for (const [key, val] of Object.entries(result)) {
    if (typeof val !== "string" || !val)
      throw new Error(`${label}.${key}: expected package name`);
  }
  return result as Variables;
}
