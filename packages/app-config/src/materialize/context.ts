export type DeployChannel = "staging" | "release" | "preview";
export type Target = { package: string; path: string };
export type Context = {
  channel: DeployChannel;
  prNumber: number;
  targets: Target[];
};
export function validateContext(
  channel: string | undefined,
  pr: number | undefined,
): boolean {
  return (
    ["staging", "release", "preview"].includes(channel ?? "") &&
    (channel !== "preview" || (Number.isSafeInteger(pr) && pr! > 0))
  );
}
export function parseContext(env: NodeJS.ProcessEnv = process.env): Context {
  const channel = env.DEPLOY_CHANNEL;
  const prNumber = Number(env.PR_NUMBER);
  if (!validateContext(channel, prNumber))
    throw new Error(
      "Invalid DEPLOY_CHANNEL or PR_NUMBER (preview requires a positive integer)",
    );
  if (!env.TARGETS)
    throw new Error("TARGETS is required as JSON [{package,path}]");
  const targets: unknown = JSON.parse(env.TARGETS);
  if (
    !Array.isArray(targets) ||
    targets.some(
      (t) =>
        !t ||
        typeof t.package !== "string" ||
        !t.package ||
        typeof t.path !== "string" ||
        !t.path ||
        /(^|[\\/])\.\.([\\/]|$)|^[\\/]/.test(t.path),
    )
  )
    throw new Error("Invalid TARGETS; expected [{package,path}]");
  return {
    channel: channel as DeployChannel,
    prNumber: channel === "preview" ? prNumber : -1,
    targets,
  };
}
export function workerName(name: string, context: Context): string {
  return `${name}-${context.channel === "preview" ? `preview-pr-${context.prNumber}` : context.channel}`;
}
