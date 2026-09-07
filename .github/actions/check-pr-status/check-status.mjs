export async function checkPrStatus({ github, context, core, prNumber }) {
  const { owner, repo } = context.repo;
  const pull_number = Number(prNumber);

  if (!Number.isSafeInteger(pull_number) || pull_number <= 0) {
    throw new Error(`Invalid PR number: ${prNumber}`);
  }

  const { data: pr } = await github.rest.pulls.get({
    owner,
    repo,
    pull_number
  });

  const isOpen = pr.state === 'open';
  const isSameRepo = pr.head.repo?.full_name === `${owner}/${repo}`;
  const isMergeable = pr.mergeable !== false;
  const headSha = pr.head.sha;
  const baseSha = pr.base.sha;
  const title = pr.title;
  const draft = pr.draft ?? false;

  core.setOutput('is_open', String(isOpen));
  core.setOutput('is_same_repo', String(isSameRepo));
  core.setOutput('is_mergeable', String(isMergeable));
  core.setOutput('is_draft', String(draft));
  core.setOutput('head_sha', headSha);
  core.setOutput('base_sha', baseSha);
  core.setOutput('title', title);

  return {
    isOpen,
    isSameRepo,
    isMergeable,
    isDraft: draft,
    headSha,
    baseSha,
    title
  };
}
