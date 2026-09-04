export type DeployChannel = "staging" | "release" | "preview";

export const DEPLOY_CHANNEL = (process.env.DEPLOY_CHANNEL ??
  "preview") as DeployChannel;
export const PR_NUMBER = get_pr_number();
function get_pr_number(): number | undefined {
  if (process.env.PR_NUMBER === undefined) return undefined;
  return Number(process.env.PR_NUMBER);
}
export const PREVIEW_SERVICES = get_preview_services();
function get_preview_services(): string[] {
  return (process.env.PREVIEW_SERVICES ?? "").split(",");
}

export function validateContext(
  ch: DeployChannel,
  pr_num: number | undefined,
): pr_num is number {
  if (!["staging", "release", "preview"].includes(ch)) return false;
  if (ch !== "preview") return true;
  return pr_num !== undefined && pr_num >= 0;
}
