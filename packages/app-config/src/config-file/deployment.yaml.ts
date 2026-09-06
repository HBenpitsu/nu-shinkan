import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

export type Variables = Record<string, string>;
export type Deployment = {
  envs: { staging: Variables; release: Variables };
  connections: { bindings: Variables; urls: Variables };
  reviewEntry: boolean;
};
export function mapping(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (value === undefined) return {};
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label}: expected mapping`);
  return value as Record<string, unknown>;
}
export function variables(value: unknown, label: string): Variables {
  return Object.fromEntries(
    Object.entries(mapping(value, label)).map(([key, val]) => {
      if (!["string", "number", "boolean"].includes(typeof val))
        throw new Error(`${label}.${key}: expected scalar`);
      return [key, String(val)];
    }),
  );
}
function references(value: unknown, label: string): Variables {
  const result = mapping(value, label);
  for (const [key, val] of Object.entries(result)) {
    if (typeof val !== "string" || !val)
      throw new Error(`${label}.${key}: expected package name`);
  }
  return result as Variables;
}
export function parseDeployment(
  value: unknown,
  warn = console.warn,
): Deployment {
  const raw = mapping(value, "deployment");
  const envs = mapping(raw.envs, "envs");
  const connections = mapping(raw.connections, "connections");
  if (raw.reviewEntry !== undefined && typeof raw.reviewEntry !== "boolean")
    warn("Invalid reviewEntry; using false");
  return {
    envs: {
      staging: variables(envs.staging, "envs.staging"),
      release: variables(envs.release, "envs.release"),
    },
    connections: {
      bindings: references(connections.bindings, "connections.bindings"),
      urls: references(connections.urls, "connections.urls"),
    },
    reviewEntry: raw.reviewEntry === true,
  };
}
export function readDeployment(directory: string): Deployment {
  const file = join(directory, "deployment.yaml");
  return parseDeployment(
    existsSync(file) ? (YAML.parse(readFileSync(file, "utf8")) ?? {}) : {},
  );
}
