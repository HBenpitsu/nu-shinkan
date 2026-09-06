import { readFileSync } from "node:fs";
import YAML from "yaml";
import { mapping, variables, type Variables } from "./deployment.yaml.js";
export type GlobalRuntimeEnvs = {
  local: Record<string, string | null>;
  staging: Variables;
  release: Variables;
};
export const globalFile = new URL(
  "../../globalRuntimeEnvs.yaml",
  import.meta.url,
);
export function parseGlobalRuntimeEnvs(value: unknown): GlobalRuntimeEnvs {
  const raw = mapping(value, "globalRuntimeEnvs");
  const local = mapping(raw.local, "local");
  return {
    local: Object.fromEntries(
      Object.entries(local).map(([key, val]) => [
        key,
        val === null ? null : variables({ [key]: val }, "local")[key]!,
      ]),
    ),
    staging: variables(raw.staging, "staging"),
    release: variables(raw.release, "release"),
  };
}
export function readGlobalRuntimeEnvs(): GlobalRuntimeEnvs {
  return parseGlobalRuntimeEnvs(
    YAML.parse(readFileSync(globalFile, "utf8")) ?? {},
  );
}
