import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

// Preserve the requested test scope; only installation is narrowed below.
const testArgs = (process.env.FILTER ?? "")
  .split("\n")
  .filter(Boolean)
  .map((filter) => `--filter=${filter}`);

const dryRun = execFileSync(
  "pnpm",
  ["exec", "turbo", "run", "test", "--dry=json", ...testArgs],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);
const { tasks } = JSON.parse(dryRun);
// Turbo also lists dependency tasks whose packages have no matching script.
const testPackages = [
  ...new Set(
    tasks
      .filter(
        (task) =>
          task.task === "test" && task.command !== "<NONEXISTENT>",
      )
      .map((task) => task.package),
  ),
];

// The trailing ... includes workspace dependencies required by each test package.
const installArgs = testPackages.map((pkg) => `--filter=${pkg}...`);
const hasTests = testPackages.length > 0;

if (!hasTests) {
  console.log("No packages with a test script matched the filter.");
}

// JSON preserves argument boundaries when passing arrays between action steps.
appendFileSync(
  process.env.GITHUB_OUTPUT,
  [
    `test_args=${JSON.stringify(testArgs)}`,
    `install_args=${JSON.stringify(installArgs)}`,
    `has_tests=${hasTests}`,
    "",
  ].join("\n"),
);
