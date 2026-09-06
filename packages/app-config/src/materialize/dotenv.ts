import { Dotenv } from "../config-file/dotenv.js";
import { resolvePreviewVariables } from "./connections.js";
import type { Settings } from "./settings.js";
import type { Context } from "./context.js";

export function generateDotenv(settings: Settings, context: Context): void {
  const dotenv = new Dotenv();
  if (!dotenv.exists()) return;
  dotenv.updateVariables(
    resolvePreviewVariables(
      { ...dotenv.variables, ...settings.overrides },
      settings,
      context,
    ),
  );
  dotenv.genDeployment();
}
