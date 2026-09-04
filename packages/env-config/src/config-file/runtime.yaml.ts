import { readFileSync } from "fs";
import { join, basename } from "path";
import { cwd } from "process";
import yaml from "yaml";
import type { DeployChannel } from "../materialize/context.js";

export type EnvironmentVariableOptions = {
  local: { [key: string]: string };
  release: { [key: string]: string };
  staging: { [key: string]: string };
};

export type RuntimeVariablesConfigration = {
  globals: EnvironmentVariableOptions;
  apps: { [key: string]: EnvironmentVariableOptions };
};

export type RuntimeVariables = {
  globals: EnvironmentVariableOptions;
  apps: EnvironmentVariableOptions;
};

function exists(): boolean {
  return true;
}
function read(): RuntimeVariables {
  const fileContent = readFileSync(
    join(import.meta.dirname, "../../runtime.yaml"),
    "utf-8",
  );
  const config = yaml.parse(fileContent) as RuntimeVariablesConfigration;
  return {
    globals: config.globals ?? ({} as EnvironmentVariableOptions),
    apps: config.apps[basename(cwd())] ?? ({} as EnvironmentVariableOptions),
  };
}
function empty(): RuntimeVariables {
  return {
    globals: { local: {}, release: {}, staging: {} },
    apps: { local: {}, release: {}, staging: {} },
  };
}

function resolve(
  runtimeVariables: RuntimeVariables,
  deployChannel: DeployChannel,
): Record<string, string> {
  if (deployChannel === "release") {
    return {
      ...runtimeVariables.globals.release,
      ...runtimeVariables.apps.release,
    };
  }

  return {
    ...runtimeVariables.globals.staging,
    ...runtimeVariables.apps.staging,
  };
}

export const runtimeConfig = {
  exists,
  read,
  empty,
  resolve,
};
