import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

export function resolveWorkerTargets(packagesJson) {
  const names = JSON.parse(packagesJson);
  const targets = JSON.parse(
    execFileSync('pnpm', ['exec', 'tsx', 'scripts/workspace/configs-cli.ts', '--targets', '--', ...names], {
      encoding: 'utf8'
    })
  );
  appendFileSync(process.env.GITHUB_OUTPUT, `targets=${JSON.stringify(targets)}\n`);
}

resolveWorkerTargets(process.env.INPUT_PACKAGES);
