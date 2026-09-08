import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { normalizeFilterInput } from "./normalize-filter-input.mjs";

const task = process.env.INPUT_TASK;
if (!task || !/^[\w:-]+$/.test(task))
  throw new Error("A valid task input is required");
const filter = process.env.INPUT_FILTER ?? "";
const filters = normalizeFilterInput(filter);
const explicitEmpty = filter.trim() !== "" && filters.length === 0;
const tasks = explicitEmpty
  ? []
  : JSON.parse(
      execFileSync(
        "pnpm",
        [
          "exec",
          "turbo",
          "run",
          task,
          "--dry=json",
          "--only",
          ...filters.map((filter) => `--filter=${filter}`),
        ],
        { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
      ),
    ).tasks;
if (!Array.isArray(tasks)) throw new Error("Invalid Turbo task output");
const packages = [
  ...new Set(
    tasks
      .filter(
        (entry) =>
          entry.task === task &&
          typeof entry.command === "string" &&
          entry.command !== "<NONEXISTENT>",
      )
      .map((entry) => {
        if (typeof entry.package !== "string" || !entry.package)
          throw new Error("Invalid Turbo package");
        return entry.package;
      }),
  ),
];
appendFileSync(
  process.env.GITHUB_OUTPUT,
  [
    `packages=${JSON.stringify(packages)}`,
    `deps_args=${JSON.stringify(packages.map((pkg) => `--filter=${pkg}...`))}`,
    `direct_args=${JSON.stringify(packages.map((pkg) => `--filter=${pkg}`))}`,
    `has_hit=${packages.length > 0}`,
    "",
  ].join("\n"),
);
