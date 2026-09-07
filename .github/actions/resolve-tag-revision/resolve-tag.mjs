import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

export function resolveTagRevision({ event, channel, before, after, created }) {
  if (!['staging', 'release'].includes(channel)) {
    throw new Error('Invalid channel');
  }
  const ref = event === 'workflow_dispatch' ? `refs/tags/${channel}` : after;
  const head = execFileSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], { encoding: 'utf8' }).trim();
  const base = event === 'workflow_dispatch' || created === 'true' ? '' : (before ?? '');
  appendFileSync(process.env.GITHUB_OUTPUT, `channel=${channel}\nhead=${head}\nbase=${base}\n`);
}

resolveTagRevision({
  event: process.env.INPUT_EVENT_NAME,
  channel: process.env.INPUT_CHANNEL,
  before: process.env.INPUT_BEFORE,
  after: process.env.INPUT_AFTER,
  created: process.env.INPUT_CREATED
});
