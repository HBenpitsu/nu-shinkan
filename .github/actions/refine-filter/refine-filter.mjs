import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const task = process.env.TASK;

// Preserve the requested test scope; only installation is narrowed below.
const testArgs = (process.env.FILTER ?? "")
  .split("\n")
  .filter(Boolean)
  .map((filter) => `--filter=${filter}`);

const dryRun = execFileSync(
  "pnpm",
  ["exec", "turbo", "run", task, "--dry=json", ...testArgs],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);
const { tasks } = JSON.parse(dryRun);
// Turbo also lists dependency tasks whose packages have no matching script.
const packagesHavingTheTask = [
  ...new Set(
    tasks
      .filter(
        (task) =>
          task.task === process.env.TASK && task.command !== "<NONEXISTENT>",
      )
      .map((task) => task.package),
  ),
];

// The trailing ... includes workspace dependencies required by each package.
const installArgs = packagesHavingTheTask.map((pkg) => `--filter=${pkg}...`);
const hasTests = packagesHavingTheTask.length > 0;

if (!hasTests) {
  console.log("No packages with the requested task matched the filter.");
}

// JSON preserves argument boundaries when passing arrays between action steps.
appendFileSync(
  process.env.GITHUB_OUTPUT,
  [
    `direct_args=${JSON.stringify(testArgs)}`,
    `deps_args=${JSON.stringify(installArgs)}`,
    `has_tests=${hasTests}`,
    "",
  ].join("\n"),
);
