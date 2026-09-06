import { readFileSync, writeFileSync } from "node:fs";
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
const globalFile = new URL("../../globalRuntimeEnvs.yaml", import.meta.url);

// Main Logic

export function readGlobalRuntimeEnvs(): GlobalRuntimeEnvs {
  return asGlobalRuntimeEnvs(
    YAML.parse(readFileSync(globalFile, "utf8")) ?? {},
  );
}

function asGlobalRuntimeEnvs(value: unknown): GlobalRuntimeEnvs {
  const raw = asRecord(value, "globalRuntimeEnvs");
  return {
    // localのnullは削除指示なので、文字列化せず同期処理へ渡す。
    local: asNullableVariables(raw.local, "local"),
    staging: asVariables(raw.staging, "staging"),
    release: asVariables(raw.release, "release"),
  };
}

export function removeNullFromGlobalRuntimeEnvsYaml(dryRun = false): void {
  const document = YAML.parseDocument(readFileSync(globalFile, "utf8"));

  const localProfileEnvs = asGlobalRuntimeEnvs(document.toJS()).local;

  for (const [key, value] of Object.entries(localProfileEnvs)) {
    if (value === null) {
      document.deleteIn(["local", key]);
    }
  }

  if (!dryRun) {
    writeFileSync(globalFile, document.toString());
  }
}

export const testExports = {
  asGlobalRuntimeEnvs,
};
