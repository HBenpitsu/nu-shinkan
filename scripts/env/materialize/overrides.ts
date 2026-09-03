import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { configPath } from "./paths.js";
import type { ConfigFile, DeployEnv, StageVariables } from "./types.js";

export function readConfig(): ConfigFile {
  const text = readFileSync(configPath, "utf8");
  return parse(text) as ConfigFile;
}

export function resolveRuntimeVariables(
  globals: StageVariables | undefined,
  appStages: StageVariables | undefined,
  stage: DeployEnv,
): Record<string, string> {
  const globalStage = resolveStage(globals, stage);
  const appStage = resolveStage(appStages, stage);
  return { ...globalStage, ...appStage };
}

export function resolveLocalVariables(
  globals: StageVariables | undefined,
  appStages: StageVariables | undefined,
): Record<string, string> {
  return {
    ...(globals?.local ?? {}),
    ...(appStages?.local ?? {}),
  };
}

function resolveStage(
  stages: StageVariables | undefined,
  stage: DeployEnv,
): Record<string, string> {
  if (!stages) {
    return {};
  }

  if (stage === "preview") {
    return {
      ...(stages.staging ?? {}),
      ...(stages.preview ?? {}),
    };
  }

  return { ...(stages[stage] ?? {}) };
}
