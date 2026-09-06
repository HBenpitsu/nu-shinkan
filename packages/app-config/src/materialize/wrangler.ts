import {
  wranglerJsonc,
  type WranglerConfig,
} from "../config-file/wrangler.jsonc.js";
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
  if (!wranglerJsonc.exists()) return;

  const original = wranglerJsonc.read();
  const resolved = resolveWranglerSettings(original, settings, context);
  const published = applyPublicationSettings(resolved, context);
  wranglerJsonc.generate(published);
}

// Helper

function resolveWranglerSettings(
  original: WranglerConfig,
  settings: Settings,
  context: Context,
): WranglerConfig {
  const { env, ...base } = original;
  const { profile } = context;
  const selected = env?.[profile] ?? {};
  // ネイティブ設定 → profile設定 → 共有・パッケージ設定の順で上書きする。
  const config = {
    ...base,
    ...selected,
    name: buildWorkerName(original.name, context),
    vars: resolvePreviewVariables(
      { ...base.vars, ...selected.vars, ...settings.overrides },
      settings,
      context,
    ),
  } as WranglerConfig;
  config.services = resolveServiceBindings(
    config.services ?? [],
    settings,
    context,
  );
  return config;
}

function applyPublicationSettings(
  original: WranglerConfig,
  context: Context,
): WranglerConfig {
  const config = { ...original };
  // previewに本番用routeを引き継がず、workers.devで公開する。
  if (context.channel === "preview") {
    delete config.routes;
    delete config.route;
    config.workers_dev = true;
  }
  return config;
}
