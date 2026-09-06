import { WranglerJsonc } from "@repo/app-config/wrangler";
import { execFileSync } from "child_process";

const wranglerJsonc = new WranglerJsonc();
const workerName = wranglerJsonc.name;
const prNumber = process.env.PR_NUMBER;
const previewWorkerName = `${workerName}-preview-pr-${prNumber}`;
const NOT_FOUND_CODE = "[code: 10090]";

async function main() {
  // collect missing environment variables
  if (!prNumber)
    throw new Error(`Missing required environment variables: PR_NUMBER`);

  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execFileSync("pnpm", [
        "wrangler",
        "delete",
        previewWorkerName,
        "--force",
      ]);
      break;
    } catch (err) {
      if (err instanceof Error && err.message.includes(NOT_FOUND_CODE)) {
        console.log(
          `Preview worker ${previewWorkerName} not found, skipping deletion.`,
        );
        break;
      } else {
        console.warn(
          `Failed to delete preview worker ${previewWorkerName}:`,
          err,
        );
        console.warn(`retrying... (${attempt}/3)`);
        lastError = err;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
  }

  if (lastError) {
    throw lastError;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
