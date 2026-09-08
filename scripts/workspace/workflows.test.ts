import {
  readFileSync,
  readdirSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import YAML from "yaml";
import { expect, it } from "vitest";

type Concurrency = {
  group: string;
  "cancel-in-progress"?: boolean;
};
type Workflow = {
  on: Record<string, unknown>;
  concurrency?: Concurrency;
  jobs: Record<string, { concurrency?: Concurrency }>;
};
type Action = { runs: { steps: { run?: string }[] } };

const root = resolve(import.meta.dirname, "../..");
const helper = (name: string) =>
  import(
    new URL(`../../.github/actions/preview-deploy/${name}.mjs`, import.meta.url)
      .href
  );
const workflows: Workflow[] = readdirSync(join(root, ".github/workflows"))
  .filter((f) => f.endsWith(".yml"))
  .map((f) =>
    YAML.parse(readFileSync(join(root, ".github/workflows", f), "utf8")),
  );

it("rejects stale or closed preview requests, but permits manual cleanup after reopening", async () => {
  const { isValidPreview, shouldCleanup } = await helper("pr");
  const pr = {
    state: "open",
    head: { sha: "head", repo: { full_name: "org/repo" } },
    base: { sha: "base" },
  };
  const request = { repository: "org/repo", headSha: "head", baseSha: "base" };
  expect(isValidPreview(pr, request)).toBe(true);
  expect(isValidPreview(pr, { ...request, headSha: "old" })).toBe(false);
  expect(isValidPreview(pr, { ...request, baseSha: "old" })).toBe(false);
  expect(isValidPreview(pr, { ...request, repository: "fork/repo" })).toBe(
    false,
  );
  expect(isValidPreview({ ...pr, state: "closed" }, request)).toBe(false);
  expect(shouldCleanup(pr, false)).toBe(false);
  expect(shouldCleanup(pr, true)).toBe(true);
  expect(shouldCleanup({ ...pr, state: "closed" }, false)).toBe(true);
});

it("serializes preview and cleanup for the same PR, and update/full for the same channel", () => {
  // Resolve the small set of context lookups used by concurrency, not YAML programs.
  const group = (value: string, context: Record<string, unknown>) =>
    value.replace(/\$\{\{(.*?)\}\}/g, (_, expression: string) => {
      const values = expression.split("||").map((path) =>
        path
          .trim()
          .split(".")
          .reduce<unknown>(
            (v, key) =>
              typeof v === "object" && v !== null
                ? (v as Record<string, unknown>)[key]
                : undefined,
            context,
          ),
      );
      return String(values.find(Boolean) ?? "");
    });
  const preview = workflows.filter(
    (w) =>
      w.on.pull_request ||
      (w.on.issue_comment && JSON.stringify(w).includes("preview-deploy")),
  );
  expect(preview).toHaveLength(3);
  for (const number of [12, 34]) {
    for (const w of preview) {
      const locks = [
        w.concurrency,
        ...Object.values(w.jobs).map((j) => j.concurrency),
      ].filter((lock): lock is Concurrency => lock !== undefined);
      expect(locks).toHaveLength(1);
      const events: Record<string, { number: number }>[] = w.on.pull_request
        ? [{ pull_request: { number } }]
        : [{ issue: { number } }];
      if (w.on.workflow_dispatch) events.push({});
      for (const event of events) {
        const inputs = Object.keys(event).length
          ? {}
          : { pr_number: String(number) };
        expect(group(locks[0]!.group, { github: { event }, inputs })).toBe(
          `preview-pr-${number}`,
        );
        expect(locks[0]!["cancel-in-progress"]).toBe(false);
      }
    }
  }
  const updates = workflows.filter((w) =>
    JSON.stringify(w).includes("deploy-channel-"),
  );
  for (const channel of ["staging", "release"]) {
    for (const w of updates) {
      const locks = [
        w.concurrency,
        ...Object.values(w.jobs).map((j) => j.concurrency),
      ].filter((lock): lock is Concurrency => lock !== undefined);
      expect(locks).toHaveLength(1);
      expect(
        group(locks[0]!.group, {
          github: { ref_name: channel },
          inputs: { channel },
        }),
      ).toBe(`deploy-channel-${channel}`);
    }
  }
});

it("attempts remaining deployments after a failure and reports their actual results", async () => {
  const fixture = mkdtempSync(join(tmpdir(), "preview-deploy-"));
  try {
    writeFileSync(
      join(fixture, "package.json"),
      JSON.stringify({
        name: "fixture",
        private: true,
        packageManager: "pnpm@11.23.0",
      }),
    );
    writeFileSync(
      join(fixture, "pnpm-workspace.yaml"),
      "packages: ['apps/*']\n",
    );
    writeFileSync(
      join(fixture, "turbo.json"),
      JSON.stringify({
        tasks: { deploy: { cache: false, dependsOn: ["^deploy"] } },
      }),
    );
    symlinkSync(
      join(root, "node_modules"),
      join(fixture, "node_modules"),
      "dir",
    );
    for (const [name, exit] of [
      ["api", 1],
      ["web", 0],
    ] as const) {
      mkdirSync(join(fixture, "apps", name), { recursive: true });
      writeFileSync(
        join(fixture, "apps", name, "package.json"),
        JSON.stringify({
          name,
          ...(name === "web" ? { dependencies: { api: "workspace:*" } } : {}),
          scripts: {
            deploy: `node -e "require('fs').writeFileSync('attempted', 'yes'); process.exit(${exit})"`,
          },
        }),
      );
    }
    writeFileSync(
      join(fixture, "pnpm-lock.yaml"),
      "lockfileVersion: '9.0'\nimporters:\n  .: {}\n  apps/api: {}\n  apps/web:\n    dependencies:\n      api:\n        specifier: workspace:*\n        version: link:../api\n",
    );
    const action: Action = YAML.parse(
      readFileSync(
        join(root, ".github/actions/preview-deploy/action.yaml"),
        "utf8",
      ),
    );
    // Exercise the real deploy command without fixing a step name or implementation API.
    const command = action.runs.steps.find((s) =>
      s.run?.includes("turbo run deploy "),
    )?.run;
    if (!command) throw new Error("Preview deploy command is missing");
    const output = join(fixture, "outputs");
    const result = spawnSync(
      "bash",
      ["--noprofile", "--norc", "-eo", "pipefail", "-c", command],
      {
        cwd: fixture,
        encoding: "utf8",
        env: {
          ...process.env,
          FILTER: '["--filter=api","--filter=web"]',
          GITHUB_OUTPUT: output,
          NO_COLOR: "1",
        },
      },
    );
    expect(result.status, result.stdout + result.stderr).toBe(0); // Failure is reported by notification, after all attempts.
    for (const name of ["api", "web"])
      expect(
        readFileSync(join(fixture, "apps", name, "attempted"), "utf8"),
      ).toBe("yes");
    const values = Object.fromEntries(
      readFileSync(output, "utf8")
        .trim()
        .split("\n")
        .map((line) => [
          line.slice(0, line.indexOf("=")),
          line.slice(line.indexOf("=") + 1),
        ]),
    );
    const { buildPreviewDeployReport } = await helper("comment");
    const report = buildPreviewDeployReport({
      targetsText: '[{"package":"api"},{"package":"web"}]',
      deployPackagesText: '["api","web"]',
      deployStatusText: values.status,
      summaryPath: resolve(fixture, values.summary_path!),
      logPath: values.log_path,
      jobStatus: "success",
      prValid: "true",
    });
    expect(
      report.results.map((r: { package: string; status: string }) => [
        r.package,
        r.status,
      ]),
    ).toEqual([
      ["api", "failed"],
      ["web", "deployed"],
    ]);
    expect(report.hasFailure).toBe(true);
    expect(report.status).toBe("partially failed");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}, 20000);

it("reports an invalidated PR as a successful no-op and preserves preparation failures", async () => {
  const { buildPreviewDeployReport } = await helper("comment");
  const inputs = {
    targetsText: '[{"package":"api"}]',
    deployPackagesText: '["api"]',
    jobStatus: "success",
    prValid: "false",
  };
  expect(buildPreviewDeployReport(inputs)).toMatchObject({
    status: "no-op",
    hasFailure: false,
  });
  expect(
    buildPreviewDeployReport({
      ...inputs,
      jobStatus: "failure",
      stepsText: '{"build":{"outcome":"failure"}}',
    }),
  ).toMatchObject({ status: "failed", hasFailure: true });
});
