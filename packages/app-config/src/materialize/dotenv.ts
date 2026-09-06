import { dotenv } from "../config-file/dotenv.js";
import { previewVariables, type Settings } from "./settings.js";
import type { Context } from "./context.js";
export function generateDotenv(settings: Settings, context: Context): void {
  if (!dotenv.exists()) return;
  const native = Object.fromEntries(
    Object.entries(dotenv.read()).map(([key, value]) => [
      key.replace(/^VITE_/, ""),
      value,
    ]),
  );
  dotenv.generate(
    dotenv.prefix(
      previewVariables({ ...native, ...settings.overrides }, settings, context),
    ),
  );
}
