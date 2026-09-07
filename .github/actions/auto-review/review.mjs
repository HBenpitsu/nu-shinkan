export async function runAutoReview({ github, context, core, prNumber }) {
  const { owner, repo } = context.repo;
  const issue_number = Number(prNumber);

  core.info(`Running automated review for PR #${issue_number}`);

  const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: issue_number });
  const { data: files } = await github.rest.pulls.listFiles({ owner, repo, pull_number: issue_number, per_page: 100 });

  const changedFiles = files.map(f => f.filename);
  const largeFiles = files.filter(f => f.changes > 500);

  const reviewNotes = [];
  if (largeFiles.length > 0) {
    reviewNotes.push(`⚠️ **Large Change Warning:** The following files contain over 500 changed lines:\n` + largeFiles.map(f => `- \`${f.filename}\` (${f.changes} lines)`).join('\n'));
  }

  const reviewSummary = [
    '<!-- auto-review-summary -->',
    '## 🔍 Automated Code Review Summary',
    `**Target Branch:** \`${pr.base.ref}\` | **Files Changed:** ${changedFiles.length}`,
    reviewNotes.length > 0 ? reviewNotes.join('\n\n') : '✅ All initial automated checks passed cleanly!'
  ].join('\n\n');

  const comments = await github.paginate(github.rest.issues.listComments, { owner, repo, issue_number });
  const existing = comments.find(c => c.user?.type === 'Bot' && c.body?.includes('<!-- auto-review-summary -->'));

  if (existing) {
    await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body: reviewSummary });
  } else {
    await github.rest.issues.createComment({ owner, repo, issue_number, body: reviewSummary });
  }
}
