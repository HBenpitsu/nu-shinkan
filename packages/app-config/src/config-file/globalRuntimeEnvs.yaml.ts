import { readFileSync } from "node:fs";
import YAML from "yaml";
import {
  asRecord,
  asVariables,
  asNullableVariables,
  type Variables,
} from "./parse.js";
export type GlobalRuntimeEnvs = {
  local: Record<string, string | null>;
  staging: Variables;
  release: Variables;
};
export const globalFile = new URL(
  "../../globalRuntimeEnvs.yaml",
  import.meta.url,
);

// Main Logic

export function readGlobalRuntimeEnvs(): GlobalRuntimeEnvs {
  return asGlobalRuntimeEnvs(
    YAML.parse(readFileSync(globalFile, "utf8")) ?? {},
  );
}

export function asGlobalRuntimeEnvs(value: unknown): GlobalRuntimeEnvs {
  const raw = asRecord(value, "globalRuntimeEnvs");
  return {
    // localのnullは削除指示なので、文字列化せず同期処理へ渡す。
    local: asNullableVariables(raw.local, "local"),
    staging: asVariables(raw.staging, "staging"),
    release: asVariables(raw.release, "release"),
  };
}
