import { WranglerJsonc } from "../config-file/wrangler.jsonc.js";
import type { Context } from "./context.js";
import {
  buildWorkerName,
  resolvePreviewVariables,
  resolveServiceBindings,
} from "./connections.js";
import type { Settings } from "./settings.js";

// Main Logic

export function generateWranglerJsonc(
  settings: Settings,
  context: Context,
): void {
  const wranglerJsonc = new WranglerJsonc();
  if (!wranglerJsonc.exists()) return;

  const name = buildWorkerName(wranglerJsonc.name, context);
  wranglerJsonc.useProfile(context.profile);
  wranglerJsonc.update({
    name,
    vars: resolvePreviewVariables(
      { ...wranglerJsonc.variables, ...settings.overrides },
      settings,
      context,
    ),
    services: resolveServiceBindings(wranglerJsonc.services, settings, context),
  });
  if (context.channel === "preview") wranglerJsonc.useWorkersDev();
  wranglerJsonc.genDeployment();
}
