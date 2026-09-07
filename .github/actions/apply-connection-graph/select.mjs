import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

export function selectReviewTargets(sourcesJson) {
  const sources = JSON.parse(sourcesJson);
  if (!Array.isArray(sources) || sources.some(s => typeof s !== 'string' || !s)) {
    throw new Error('Invalid sources');
  }
  const graph = execFileSync('pnpm', ['exec', 'tsx', 'scripts/connection-graph/build.ts'], { encoding: 'utf8' });
  const targets = JSON.parse(
    execFileSync('pnpm', ['exec', 'tsx', 'scripts/connection-graph/select.ts', '--graph', '-', '--', ...sources], {
      input: graph,
      encoding: 'utf8'
    })
  );
  appendFileSync(process.env.GITHUB_OUTPUT, `deploy_targets=${JSON.stringify(targets)}\n`);
}

selectReviewTargets(process.env.SOURCES);
