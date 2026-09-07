import type { Variables } from "../config-file/deployment.yaml.js";
import type { Context } from "./context.js";
import type { Settings } from "./settings.js";

// Main Logic

export function resolvePreviewVariables(
  values: Variables,
  settings: Settings,
  context: Context,
): Variables {
  const result = { ...values };
  if (context.channel !== "preview") return result;

  for (const [key, pkg] of Object.entries(
    settings.deployment.connections.urls,
  )) {
    // 今回のpreview対象外への接続は、基準となるstaging設定を維持する。
    const target = context.targets.get(pkg);
    if (!target) continue;
    const name = target.workerName;
    if (!name) throw new Error(`No Worker for URL connection: ${pkg}`);
    if (!values[key]) throw new Error(`Missing base URL: ${key}`);
    // 接続先をpreview用のHTTPS URLへ変え、元URLのパス・クエリは保持する。
    const url = new URL(values[key]);
    url.protocol = "https:";
    url.hostname = `${buildWorkerName(name, context)}.nushinkan2.workers.dev`;
    url.port = "";
    result[key] = url.toString();
  }
  return result;
}

/** 対象内の接続はpreviewへ、対象外の接続は基準profileへ向ける。 */
export function resolveServiceBindings<
  T extends { binding: string; service: string },
>(bindings: T[], settings: Settings, context: Context): T[] {
  const { profile } = context;
  // preview内の接続だけを差し替え、対象外はprofileのWorkerへ接続する。
  const resolved = bindings.map((binding) => {
    const pkg = settings.deployment.connections.bindings[binding.binding];
    const target = pkg === undefined ? undefined : context.targets.get(pkg);
    const preview = context.channel === "preview" && target !== undefined;
    const bare = preview ? target.workerName : binding.service;
    if (!bare) throw new Error(`No Worker for binding: ${pkg}`);
    return {
      ...binding,
      service: buildWorkerName(
        bare,
        preview ? context : { channel: profile, prNumber: context.prNumber },
      ),
    };
  });
  for (const binding of Object.keys(settings.deployment.connections.bindings)) {
    if (!resolved.some((s) => s.binding === binding))
      throw new Error(`Missing native binding: ${binding}`);
  }
  return resolved;
}

// Helper

/** URLとService Bindingで同じWorker命名規則を使う。 */
export function buildWorkerName(
  name: string,
  context: Pick<Context, "channel" | "prNumber">,
): string {
  const suffix =
    context.channel === "preview"
      ? `preview-pr-${context.prNumber}`
      : context.channel;
  return `${name}-${suffix}`;
}
