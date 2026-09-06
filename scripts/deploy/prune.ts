import { readFileSync } from "node:fs";
import { parse, type ParseError } from "jsonc-parser";
import { pathToFileURL } from "node:url";

/** Delete only this package's Worker for the explicitly supplied PR. */
export async function prune(
  name: string,
  pr: string,
  account: string,
  token: string,
  fetcher = fetch,
) {
  if (!/^[1-9]\d*$/.test(pr) || !Number.isSafeInteger(Number(pr)))
    throw Error("PR_NUMBER must be a positive integer");
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name))
    throw Error("Invalid Worker base name");
  if (!account || !token) throw Error("Cloudflare credentials are required");
  const worker = `${name}-preview-pr-${pr}`;
  const response = await fetcher(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account)}/workers/scripts/${worker}?force=true`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30000),
    },
  );
  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;
  // An unrelated 404 must not hide a bad account or endpoint.
  if (
    response.status === 404 &&
    body?.errors?.some((e: { code: number }) => e.code === 10007)
  )
    return { worker, status: "absent" };
  if (!response.ok || body?.success === false)
    throw Error(`Delete ${worker} failed (${response.status}): ${text}`);
  return { worker, status: "deleted" };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const errors: ParseError[] = [];
  const config = parse(readFileSync("wrangler.jsonc", "utf8"), errors);
  if (errors.length || typeof config?.name !== "string")
    throw Error("Invalid wrangler.jsonc");
  console.log(
    await prune(
      config.name,
      process.env.PR_NUMBER ?? "",
      process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
      process.env.CLOUDFLARE_API_TOKEN ?? "",
    ),
  );
}
