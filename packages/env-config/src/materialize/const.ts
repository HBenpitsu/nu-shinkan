type DEPLOY_CHANNEL = "staging" | "release" | "preview";
type PR_NUMBER = number;

export const DEPLOY_CHANNEL = (process.env.DEPLOY_CHANNEL ??
  "preview") as DEPLOY_CHANNEL;
export const PR_NUMBER = Number(process.env.PR_NUMBER ?? 0) as PR_NUMBER;
