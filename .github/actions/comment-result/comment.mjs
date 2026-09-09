import { pathToFileURL } from "node:url";

function parseRepository(fullName) {
  const [owner, repo] = String(fullName || "").split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY: ${fullName}`);
  }
  return { owner, repo };
}

function normalizeIssueNumber(prNumber) {
  const issueNumber = Number(prNumber);
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0) {
    throw new Error(`Invalid PR or issue number: ${prNumber}`);
  }
  return issueNumber;
}

function buildCommentBody({ marker, title, body, status, artifactUrl }) {
  const commentMarker = marker ? `<!-- ${marker} -->` : "<!-- result-comment -->";
  const lines = [commentMarker];

  if (title) {
    lines.push(`## ${title}`);
  }

  if (status) {
    const statusEmoji =
      status === "success" ? "✅" : status === "failure" ? "❌" : "ℹ️";
    lines.push(`**Status:** ${statusEmoji} ${status}`);
  }

  if (body) {
    lines.push(body);
  }

  if (artifactUrl) {
    lines.push(`[Download Artifact / Reports](${artifactUrl})`);
  }

  return lines.join("\n\n");
}

async function githubRequest({ token, method = "GET", path, body }) {
  const apiBase = process.env.GITHUB_API_URL || "https://api.github.com";
  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${method} ${path} failed: HTTP ${response.status} ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function listComments({ token, owner, repo, issueNumber }) {
  const comments = [];
  let page = 1;

  for (;;) {
    const chunk = await githubRequest({
      token,
      path: `/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100&page=${page}`,
    });

    if (!Array.isArray(chunk)) {
      throw new Error("Unexpected response while listing comments");
    }

    comments.push(...chunk);
    if (chunk.length < 100) break;
    page += 1;
  }

  return comments;
}

export async function upsertComment({
  token,
  repository,
  prNumber,
  marker,
  title,
  body,
  status,
  artifactUrl,
}) {
  if (!token) {
    throw new Error("Missing GitHub token. Provide input 'token' or GITHUB_TOKEN.");
  }

  const { owner, repo } = parseRepository(repository);
  const issueNumber = normalizeIssueNumber(prNumber);
  const commentBody = buildCommentBody({ marker, title, body, status, artifactUrl });
  const commentMarker = marker ? `<!-- ${marker} -->` : "<!-- result-comment -->";

  const comments = await listComments({
    token,
    owner,
    repo,
    issueNumber,
  });

  const existing = comments.find(
    (c) =>
      c?.user?.type === "Bot" &&
      typeof c?.body === "string" &&
      c.body.includes(commentMarker),
  );

  if (existing?.id) {
    await githubRequest({
      token,
      method: "PATCH",
      path: `/repos/${owner}/${repo}/issues/comments/${existing.id}`,
      body: { body: commentBody },
    });
    return;
  }

  await githubRequest({
    token,
    method: "POST",
    path: `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    body: { body: commentBody },
  });
}

async function main() {
  await upsertComment({
    token: process.env.INPUT_TOKEN || process.env.GITHUB_TOKEN,
    repository: process.env.GITHUB_REPOSITORY,
    prNumber: process.env.INPUT_PR_NUMBER,
    marker: process.env.INPUT_MARKER,
    title: process.env.INPUT_TITLE,
    body: process.env.INPUT_BODY,
    status: process.env.INPUT_STATUS,
    artifactUrl: process.env.INPUT_ARTIFACT_URL,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}