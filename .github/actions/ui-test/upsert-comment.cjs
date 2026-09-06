module.exports = async ({ github, context }) => {
  const { owner, repo } = context.repo;
  const issue_number = Number(process.env.PR_NUMBER);
  if (!Number.isSafeInteger(issue_number) || issue_number <= 0) throw Error("Invalid PR or issue number");

  const body = [
    '<!-- ui_test-report -->',
    '## Playwright UI test Report',
    `Result: ${process.env.TEST_OUTCOME}`,
    `[Download UI test reports](${process.env.ARTIFACT_URL})`,
  ].join('\n\n');
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner, repo, issue_number, per_page: 100
  });
  const existing = comments.find(c =>
    c.user?.type === 'Bot' &&
    typeof c.body === 'string' &&
    c.body.includes('<!-- ui_test-report -->')
  );

  if (existing) {
    await github.rest.issues.updateComment({
      owner, repo, comment_id: existing.id, body
    });
  } else {
    await github.rest.issues.createComment({
      owner, repo, issue_number, body
    });
  }
};
