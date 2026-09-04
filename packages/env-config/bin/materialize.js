/**
 * env:materializeのエントリポイント
 * 環境に応じたビルドアーティファクトを生成する．
 */
import { runtimeConfig } from "./config-file/runtime.yaml.js";
import { dotenv } from "./config-file/dotenv.js";
import { wranglerJsonc } from "./config-file/wrangler.jsonc.js";
import { isRecord } from "./shared-helper.js";
export const DEPLOY_CHANNEL = process.env.DEPLOY_CHANNEL ?? "preview";
export const PR_NUMBER = Number(process.env.PR_NUMBER ?? 0);
/**
 * Main logic
 */
function main() {
  const runtimeConfigData = runtimeConfig.exists()
    ? runtimeConfig.read()
    : runtimeConfig.empty();
  generateDotenv(runtimeConfigData);
  generateWranglerJsonc(runtimeConfigData);
}
function generateDotenv(runtimeConfigData) {
  if (!dotenv.exists()) return;
  const originalDotenvData = dotenv.read();
  let deployDotenvData;
  if (DEPLOY_CHANNEL === "release") {
    deployDotenvData = {
      ...runtimeConfigData.globals.release,
      ...runtimeConfigData.apps.release,
    };
  } else {
    deployDotenvData = {
      ...runtimeConfigData.globals.staging,
      ...runtimeConfigData.apps.staging,
    };
  }
  deployDotenvData = dotenv.prefix(deployDotenvData);
  dotenv.generate({
    ...originalDotenvData,
    ...deployDotenvData,
  });
}
function generateWranglerJsonc(runtimeConfigData) {
  if (!wranglerJsonc.exists()) return;
  const originalWranglerJsoncData = wranglerJsonc.read();
  if (typeof originalWranglerJsoncData.vars !== "object") {
    throw new Error(
      "Expected wrangler's vars field to be an object but got " +
        typeof originalWranglerJsoncData.vars +
        ", value: " +
        JSON.stringify(originalWranglerJsoncData.vars),
    );
  }
  const originalWorkerName = originalWranglerJsoncData.name;
  if (typeof originalWorkerName !== "string") {
    throw new Error(
      "Expected wrangler's name field to be a string but got " +
        typeof originalWorkerName +
        ", value: " +
        JSON.stringify(originalWorkerName),
    );
  }
  if (originalWorkerName === "") {
    throw new Error("Expected wrangler's name field to be a non-empty string");
  }
  let deployEnvironmentVars;
  if (DEPLOY_CHANNEL === "release") {
    deployEnvironmentVars = {
      ...runtimeConfigData.globals.release,
      ...runtimeConfigData.apps.release,
    };
  } else {
    deployEnvironmentVars = {
      ...runtimeConfigData.globals.staging,
      ...runtimeConfigData.apps.staging,
    };
  }
  let extractedEnvVariant;
  if (typeof originalWranglerJsoncData.env === "string") {
    throw new Error(
      "Unexpected string type for env field. Value: " +
        JSON.stringify(originalWranglerJsoncData.env),
    );
  }
  if (isRecord(originalWranglerJsoncData.env)) {
    switch (DEPLOY_CHANNEL) {
      case "release":
        extractedEnvVariant = originalWranglerJsoncData.env["release"];
        break;
      case "staging":
        extractedEnvVariant = originalWranglerJsoncData.env["staging"];
        break;
      case "preview":
        extractedEnvVariant = originalWranglerJsoncData.env["staging"];
        break;
    }
  }
  if (extractedEnvVariant === undefined || !isRecord(extractedEnvVariant)) {
    throw new Error(
      "Expected extracted environment variant to be a record. But got " +
        typeof extractedEnvVariant +
        ". Value: " +
        JSON.stringify(extractedEnvVariant),
    );
  }
  let workerName;
  switch (DEPLOY_CHANNEL) {
    case "release":
      workerName = `${originalWorkerName}-release`;
      break;
    case "staging":
      workerName = `${originalWorkerName}-staging`;
      break;
    case "preview":
      workerName = `${originalWorkerName}-preview-${PR_NUMBER}`;
      break;
  }
  wranglerJsonc.generate({
    ...originalWranglerJsoncData,
    ...extractedEnvVariant,
    vars: {
      ...(originalWranglerJsoncData.vars ?? {}),
      ...(extractedEnvVariant ?? {}),
      ...deployEnvironmentVars,
    },
    name: workerName,
  });
}
/**
 * Entry point
 */
try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
