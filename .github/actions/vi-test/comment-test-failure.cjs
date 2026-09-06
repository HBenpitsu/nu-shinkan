module.exports = async ({ github, context }) => {
  const { owner, repo } = context.repo;
  const issue_number = Number(process.env.PR_NUMBER);
  if (!Number.isSafeInteger(issue_number) || issue_number <= 0) throw Error("Invalid PR or issue number");

  const runUrl = `${context.serverUrl}/${owner}/${repo}/actions/runs/${context.runId}`;
  const body = [
    '## tests failed',
    `[View workflow logs](${runUrl})`,
  ].join('\n\n');
  await github.rest.issues.createComment({ owner, repo, issue_number, body });
};
