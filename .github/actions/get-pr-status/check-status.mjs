import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.INPUT_TOKEN;
  const apiUrl = process.env.GITHUB_API_URL;
  const prNumber = process.env.INPUT_PR_NUMBER;
  const pull_number = Number(prNumber);

  if (!Number.isSafeInteger(pull_number) || pull_number <= 0) {
    throw new Error(`Invalid PR number: ${prNumber}`);
  }

  const response = await fetch(
    `${apiUrl}/repos/${repository}/pulls/${pull_number}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    throw new Error(`Unable to get PR ${pull_number}: HTTP ${response.status}`);
  }
  const pr = await response.json();

  const outputs = {
    is_open: pr.state === 'open',
    is_same_repo: pr.head.repo?.full_name === repository,
    is_mergeable: pr.mergeable !== false,
    is_draft: pr.draft ?? false,
    head_sha: pr.head.sha,
    base_sha: pr.base.sha,
    title: pr.title,
  };
  for (const [name, value] of Object.entries(outputs)) {
    const delimiter = `ghadelimiter_${randomUUID()}`;
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `${name}<<${delimiter}\n${value}\n${delimiter}\n`,
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
