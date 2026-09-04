import { runtimeConfig } from "../config-file/runtime.yaml.js";
import type { RuntimeVariables } from "../config-file/runtime.yaml.js";
import { dotenv } from "../config-file/dotenv.js";
import type { DeployChannel } from "./context.js";

export function generateDotenv(
  runtimeConfigData: RuntimeVariables,
  deployChannel: DeployChannel,
  prNumber: number | undefined,
  previewServices: string[],
): void {
  if (!dotenv.exists()) return;

  let dotenvData = dotenv.read();
  dotenvData = applyOverride(dotenvData, runtimeConfigData, deployChannel);

  if (deployChannel === "preview") {
    dotenvData = dynamicServiceBindingOverride(
      dotenvData,
      prNumber!,
      previewServices,
    );
  }

  dotenv.generate(dotenvData);
}

function applyOverride(
  dotenvData: Record<string, string>,
  runtimeConfigData: RuntimeVariables,
  deployChannel: DeployChannel,
): Record<string, string> {
  const deployDotenvData = dotenv.prefix(
    runtimeConfig.resolve(runtimeConfigData, deployChannel),
  );
  return {
    ...dotenvData,
    ...deployDotenvData,
  };
}

function dynamicServiceBindingOverride(
  dotenvData: Record<string, string>,
  prNumber: number,
  previewServices: string[],
): Record<string, string> {
  const overridenDotenvData: Record<string, string> = {};
  for (const [key, value] of Object.entries(dotenvData)) {
    if (key.startsWith("BIND") || key.startsWith("VITE_BIND")) {
      for (const service of previewServices) {
        overridenDotenvData[key] = value.replace(
          service,
          `${service}-preview-pr-${prNumber}`,
        );
      }
    } else {
      overridenDotenvData[key] = value;
    }
  }

  return overridenDotenvData;
}
