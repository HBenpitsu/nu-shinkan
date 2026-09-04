/**
 * env:materializeのエントリポイント
 * 環境に応じたビルドアーティファクトを生成する．
 */

import { runtimeConfig } from "./config-file/runtime.yaml.js";
import { generateDotenv } from "./materialize/dotenv.js";
import { generateWranglerJsonc } from "./materialize/wrangler.js";
import {
  validateContext,
  DEPLOY_CHANNEL,
  PR_NUMBER,
  PREVIEW_SERVICES,
} from "./materialize/context.js";

/**
 * Main logic
 */
function main(): void {
  const pr_num = PR_NUMBER;
  if (!validateContext(DEPLOY_CHANNEL, pr_num)) {
    throw new Error(
      `Invalid context: DEPLOY_CHANNEL=${DEPLOY_CHANNEL}, PR_NUMBER=${pr_num}`,
    );
  }

  const runtimeConfigData = runtimeConfig.exists()
    ? runtimeConfig.read()
    : runtimeConfig.empty();

  generateDotenv(runtimeConfigData, DEPLOY_CHANNEL, pr_num, PREVIEW_SERVICES);
  generateWranglerJsonc(
    runtimeConfigData,
    DEPLOY_CHANNEL,
    pr_num,
    PREVIEW_SERVICES,
  );
}

/**
 * Entry point
 */
if (process.env.VITEST !== "true") {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
