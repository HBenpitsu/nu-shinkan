type Package = { package: string; path: string };
type DeployTarget = Package & { workerName?: string };
export type Result = Package & {
  status: "success" | "unnecessary" | "failure";
  worker?: string;
  url?: string;
  error?: string;
};
export type Report = {
  repository: string;
  runId: string;
  pr: number;
  head: string;
  base?: string;
  channel: string;
  phase: string;
  changes: string[];
  targets: DeployTarget[];
  results: Result[];
  error?: string;
  notificationError?: string;
  cleanup?: unknown;
};
