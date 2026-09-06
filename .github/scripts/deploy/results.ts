import type { Package } from "./workspace.js";
export type Result = Package & {
  status: "success" | "unnecessary" | "failure";
  worker?: string;
  url?: string;
  error?: string;
};
export type Summary = {
  tasks?: {
    package: string;
    task: string;
    execution?: { exitCode?: number; error?: string };
  }[];
};
export function resultFor(
  pkg: Package,
  deployable: boolean,
  summary: Summary,
  log: string,
  config?: { name?: string; assets?: unknown },
): Result {
  if (!deployable) return { ...pkg, status: "unnecessary" };
  const task = summary.tasks?.find(
    (t) => t.package === pkg.package && t.task === "deploy",
  );
  const success = task?.execution?.exitCode === 0;
  const url = config?.assets
    ? log.match(/https:\/\/[a-z0-9.-]+\.workers\.dev\/?/i)?.[0]
    : undefined;
  return {
    ...pkg,
    status: success ? "success" : "failure",
    worker: config?.name,
    url: success ? url : undefined,
    error: success
      ? undefined
      : (task?.execution?.error ?? "Deploy did not report a successful exit"),
  };
}
export type Report = {
  repository: string;
  runId: string;
  pr: number;
  head: string;
  base?: string;
  channel: string;
  phase: string;
  changes: Package[];
  targets: Package[];
  results: Result[];
  error?: string;
  notificationError?: string;
  cleanup?: unknown;
};
