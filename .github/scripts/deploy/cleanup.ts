import { prNumber } from "./request.ts";
export function ownedWorker(name: string, pr: number): boolean {
  return new RegExp(`^[a-z0-9][a-z0-9-]*-preview-pr-${prNumber(pr)}$`).test(
    name,
  );
}
export async function cleanup(
  pr: number,
  fetcher = fetch,
): Promise<
  { worker: string; status: "deleted" | "failure"; error?: string }[]
> {
  prNumber(pr);
  const account = process.env.CLOUDFLARE_ACCOUNT_ID,
    token = process.env.CLOUDFLARE_API_TOKEN;
  if (!account || !token)
    throw new Error("Cloudflare credentials are required for cleanup");
  const base = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/workers/scripts`;
  const headers = { Authorization: `Bearer ${token}` };
  const response = await fetcher(base, { headers });
  const body = (await response.json()) as {
    success: boolean;
    result?: { id: string }[];
    result_info?: { total_pages?: number };
  };
  if (
    !response.ok ||
    body.success !== true ||
    !Array.isArray(body.result) ||
    body.result.some((w) => typeof w.id !== "string")
  )
    throw new Error(`Worker listing failed (${response.status})`);
  // The scripts endpoint returns the full collection. Fail closed if that API contract changes.
  if ((body.result_info?.total_pages ?? 1) > 1)
    throw new Error("Unexpected paginated Worker listing");
  type Deletion = {
    worker: string;
    status: "deleted" | "failure";
    error?: string;
  };
  const results = new Map<string, Deletion>();
  let pending = body.result.filter((w) => ownedWorker(w.id, pr));
  // A callee can be blocked by a still-existing caller. Retry only when a pass
  // deleted something; never force-delete bindings belonging to other Workers.
  while (pending.length) {
    const failed: typeof pending = [];
    for (const worker of pending) {
      try {
        const deleted = await fetcher(
          `${base}/${encodeURIComponent(worker.id)}`,
          { method: "DELETE", headers },
        );
        if (deleted.status !== 404) {
          const result = (await deleted.json()) as { success: boolean };
          if (!deleted.ok || result.success !== true)
            throw new Error(`Worker deletion failed (${deleted.status})`);
        }
        results.set(worker.id, { worker: worker.id, status: "deleted" });
      } catch (error) {
        results.set(worker.id, {
          worker: worker.id,
          status: "failure",
          error: String(error),
        });
        failed.push(worker);
      }
    }
    if (failed.length === pending.length) break;
    pending = failed;
  }
  return [...results.values()];
}
