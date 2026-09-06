export type DeployChannel = "staging" | "release" | "preview";
export type Target = { path: string; workerName?: string };
type TargetInput = { package: string; path: string };
export type Context = {
  channel: DeployChannel;
  prNumber: number;
  targets: ReadonlyMap<string, Target>;
  profile: "staging" | "release";
};

// Main Logic

export function parseContext(env: NodeJS.ProcessEnv = process.env): Context {
  const channel = parseChannel(env.DEPLOY_CHANNEL);
  const prNumber = parsePrNumber(env.PR_NUMBER, channel);
  const targets = mergeTargets(
    parseTargets(env.TARGETS),
    parseWorkerNames(env.WORKER_NAMES),
  );
  const profile = resolveProfile(channel);

  return { channel, profile, prNumber, targets };
}

// Helper

function parseChannel(value: string | undefined): DeployChannel {
  if (value !== "staging" && value !== "release" && value !== "preview")
    throw new Error(
      "Invalid DEPLOY_CHANNEL; expected staging, release, or preview",
    );
  return value;
}

function parsePrNumber(
  value: string | undefined,
  channel: DeployChannel,
): number {
  // updateではPR番号を使用しないため、入力にかかわらず未使用値に揃える。
  if (channel !== "preview") return -1;
  const prNumber = Number(value);
  if (!Number.isSafeInteger(prNumber) || prNumber <= 0)
    throw new Error("Invalid PR_NUMBER; preview requires a positive integer");
  return prNumber;
}

function mergeTargets(
  targets: TargetInput[],
  workers: ReadonlyMap<string, string>,
): ReadonlyMap<string, Target> {
  // Worker名のない共有パッケージも対象として保持する。対象外のWorkerは取り込まない。
  return new Map(
    targets.map(({ package: name, path }) => {
      const workerName = workers.get(name);
      return [name, workerName === undefined ? { path } : { path, workerName }];
    }),
  );
}

function parseTargets(value: string | undefined): TargetInput[] {
  if (!value) throw new Error("TARGETS is required as JSON [{package,path}]");
  const targets: unknown = JSON.parse(value);
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
  return targets;
}

function parseWorkerNames(value: string | undefined): Map<string, string> {
  // 接続先の情報はリポジトリ側で収集済み。他パッケージのファイルは探索しない。
  const raw: unknown = JSON.parse(value ?? "{}");
  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    Object.values(raw).some((name) => typeof name !== "string" || !name)
  )
    throw new Error(
      "Invalid WORKER_NAMES; expected package-to-Worker-name JSON object",
    );
  return new Map(Object.entries(raw) as [string, string][]);
}

function resolveProfile(channel: DeployChannel): Context["profile"] {
  return channel === "release" ? "release" : "staging";
}
