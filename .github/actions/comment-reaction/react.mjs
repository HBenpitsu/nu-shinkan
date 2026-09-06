import { readFile } from 'node:fs/promises';

export async function react(content) {
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const commentId = event.comment?.id;
  if (!Number.isSafeInteger(commentId) || commentId <= 0) {
    throw new Error('Comment reaction requires an issue_comment event');
  }
  const response = await fetch(
    `${process.env.GITHUB_API_URL}/repos/${process.env.GITHUB_REPOSITORY}/issues/comments/${commentId}/reactions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.INPUT_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    throw new Error(`Unable to add ${content} reaction: HTTP ${response.status}`);
  }
}
