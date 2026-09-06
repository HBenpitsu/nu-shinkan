import { dotenv } from "../config-file/dotenv.js";
import { resolvePreviewVariables } from "./connections.js";
import type { Settings } from "./settings.js";
import type { Context } from "./context.js";

export function generateDotenv(settings: Settings, context: Context): void {
  if (!dotenv.exists()) return;
  // 設定のマージはVITE_なしで行い、出力時に一度だけprefixを付ける。
  const native = Object.fromEntries(
    Object.entries(dotenv.read()).map(([key, value]) => [
      key.replace(/^VITE_/, ""),
      value,
    ]),
  );
  dotenv.generate(
    dotenv.withVitePrefix(
      resolvePreviewVariables(
        { ...native, ...settings.overrides },
        settings,
        context,
      ),
    ),
  );
}
