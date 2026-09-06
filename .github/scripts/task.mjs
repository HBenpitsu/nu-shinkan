import { execFileSync } from "node:child_process";
const task = process.argv[2];
if (!["test", "build", "lint", "ui_test"].includes(task))
  throw Error("Invalid task");
const packages = JSON.parse(process.env.PACKAGES || "[]");
if (
  !Array.isArray(packages) ||
  packages.some((p) => typeof p !== "string" || !p || /[\s.\[\]!*]/.test(p))
)
  throw Error("Expected exact package names");
if (packages.length)
  execFileSync(
    "pnpm",
    [
      "exec",
      "turbo",
      "run",
      task,
      "--only",
      ...packages.map((p) => `--filter=${p}`),
      ...(task === "test" ? ["--", "--run"] : []),
    ],
    { stdio: "inherit" },
  );
