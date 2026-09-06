export function parseCommand(body: string): string[] | undefined {
  const words = body.trim().split(/\s+/);
  return words[0] === "/preview" ? words.slice(1) : undefined;
}
export function prNumber(value: string | number): number {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
    throw new Error("PR_NUMBER must be a positive integer");
  return Number(value);
}
export function operation(
  request: "deploy" | "close" | "delete",
  state: "open" | "closed",
): "deploy" | "cleanup" | "skip" {
  if (request === "delete" || state === "closed") return "cleanup";
  return request === "close" ? "skip" : "deploy";
}
export async function github<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  if (!process.env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN is required");
  const response = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
  if (!response.ok)
    throw new Error(`GitHub ${method} ${path}: ${response.status}`);
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
}
export async function currentPR(number: number): Promise<"open" | "closed"> {
  const pr = await github<{ state: "open" | "closed" }>(
    `pulls/${prNumber(number)}`,
  );
  if (!["open", "closed"].includes(pr.state))
    throw new Error("Invalid PR state");
  return pr.state;
}
