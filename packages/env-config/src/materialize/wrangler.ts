import { runtimeConfig } from "../config-file/runtime.yaml.js";
import type { RuntimeVariables } from "../config-file/runtime.yaml.js";
import {
  wranglerJsonc,
  WranglerConfig,
} from "../config-file/wrangler.jsonc.js";
import type { DeployChannel } from "./context.js";

export function generateWranglerJsonc(
  runtimeConfigData: RuntimeVariables,
  deployChannel: DeployChannel,
  prNumber: number,
  previewServices: string[],
): void {
  if (!wranglerJsonc.exists()) return;

  const originalConfigData = wranglerJsonc.read();
  let configData = flattenEnv(originalConfigData, deployChannel);
  configData = applyOverrides(configData, runtimeConfigData, deployChannel);
  configData = renameWorker(
    configData,
    originalConfigData,
    deployChannel,
    prNumber,
  );

  if (deployChannel === "preview") {
    configData = dynamicServiceBindingOverride(
      configData,
      prNumber,
      previewServices,
    );
  }

  wranglerJsonc.generate(configData);
}

function flattenEnv(
  configData: WranglerConfig,
  deployChannel: DeployChannel,
): WranglerConfig {
  if (!configData.env) return configData;

  const { env, ...base } = configData;

  const envExtracted = deployChannel === "release" ? env.release : env.staging;

  if (envExtracted === undefined) return configData;

  const { vars: envVars, ...envRest } = envExtracted;
  const { vars: baseVars, ...baseRest } = base;

  return {
    ...baseRest,
    ...envRest,
    vars: {
      ...baseVars,
      ...envVars,
    },
  };
}

function applyOverrides(
  configData: WranglerConfig,
  runtimeConfigData: RuntimeVariables,
  deployChannel: DeployChannel,
): WranglerConfig {
  const { vars, ...rest } = configData;
  const overrides = runtimeConfig.resolve(runtimeConfigData, deployChannel);

  return {
    ...rest,
    vars: {
      ...vars,
      ...overrides,
    },
  };
}

function renameWorker(
  configData: WranglerConfig,
  originalConfigData: WranglerConfig,
  deployChannel: DeployChannel,
  prNumber: number,
): WranglerConfig {
  let name: string;
  switch (deployChannel) {
    case "release":
      name = `${originalConfigData.name}-release`;
      break;
    case "staging":
      name = `${originalConfigData.name}-staging`;
      break;
    case "preview":
      name = `${originalConfigData.name}-preview-pr-${prNumber}`;
      break;
  }

  return {
    ...configData,
    name,
  };
}

function dynamicServiceBindingOverride(
  configData: WranglerConfig,
  prNumber: number,
  previewServices: string[],
): WranglerConfig {
  const { services, ...rest } = configData;

  return {
    ...rest,
    services: (services ?? []).map((service) => {
      const originalService = service.service;
      if (previewServices.includes(service.service)) {
        return {
          ...service,
          service: `${originalService}-preview-pr-${prNumber}`,
        };
      }
      return service;
    }),
  };
}
