export async function upsertComment({ github, context, prNumber, marker, title, body, status, artifactUrl }) {
  const { owner, repo } = context.repo;
  const issue_number = Number(prNumber);
  if (!Number.isSafeInteger(issue_number) || issue_number <= 0) {
    throw new Error(`Invalid PR or issue number: ${prNumber}`);
  }

  const commentMarker = marker ? `<!-- ${marker} -->` : '<!-- result-comment -->';
  const lines = [commentMarker];

  if (title) {
    lines.push(`## ${title}`);
  }
  if (status) {
    const statusEmoji = status === 'success' ? '✅' : status === 'failure' ? '❌' : 'ℹ️';
    lines.push(`**Status:** ${statusEmoji} ${status}`);
  }
  if (body) {
    lines.push(body);
  }
  if (artifactUrl) {
    lines.push(`[Download Artifact / Reports](${artifactUrl})`);
  }

  const commentBody = lines.join('\n\n');

  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number,
    per_page: 100
  });

  const existing = comments.find(c =>
    c.user?.type === 'Bot' &&
    typeof c.body === 'string' &&
    c.body.includes(commentMarker)
  );

  if (existing) {
    await github.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body: commentBody
    });
  } else {
    await github.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body: commentBody
    });
  }
}
