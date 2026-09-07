import { execSync } from 'node:child_process';

export function runIntegrationTest({ profile, filter }) {
  console.log(`Running integration tests with profile: ${profile}`);
  const filterFlag = filter ? `--filter=${filter}` : '';
  const command = `pnpm exec turbo run test:integration ${filterFlag}`.trim();

  execSync(command, {
    stdio: 'inherit',
    env: {
      ...process.env,
      TEST: 'INTEGRATION',
      APP_PROFILE: profile
    }
  });
}

runIntegrationTest({
  profile: process.env.PROFILE,
  filter: process.env.FILTER
});
