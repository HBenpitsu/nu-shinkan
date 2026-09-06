export function prNumber(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)))
    throw Error("Invalid PR number");
  return Number(value);
}
export async function github(path, method = "GET", body) {
  if (!process.env.GITHUB_TOKEN) throw Error("GITHUB_TOKEN is required");
  const response = await fetch(
    `${process.env.GITHUB_API_URL || "https://api.github.com"}/repos/${process.env.GITHUB_REPOSITORY}/${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!response.ok) throw Error(`GitHub ${method} ${path}: ${response.status}`);
  return response.status === 204 ? undefined : response.json();
}
