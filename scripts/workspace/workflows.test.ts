import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import YAML from "yaml";
import { expect, it, vi } from "vitest";

type Step = {
  id?: string;
  name?: string;
  uses?: string;
  run?: string;
  shell?: string;
  with?: Record<string, string>;
  if?: string;
};
type Input = { required?: boolean; default?: unknown };
type Job = { uses?: string; steps: Step[]; with?: Record<string, unknown> };

const root = resolve(import.meta.dirname, "../..");
const workflowDir = join(root, ".github/workflows");
const workflows = Object.fromEntries(
  readdirSync(workflowDir)
    .filter((file) => file.endsWith(".yml"))
    .map((file) => [
      file,
      YAML.parse(readFileSync(join(workflowDir, file), "utf8")),
    ]),
);
const actions = Object.fromEntries(
  readdirSync(join(root, ".github/actions")).map((name) => {
    const file = ["action.yml", "action.yaml"]
      .map((file) => join(root, ".github/actions", name, file))
      .find(existsSync);
    return [name, file ? YAML.parse(readFileSync(file, "utf8")) : null];
  }),
);
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
// YAML is executable configuration. Exercise its actual inline programs with isolated GitHub and process adapters.
async function execute(
  file: string,
  job: string,
  id: string,
  env: Record<string, string>,
  mocks: Record<string, unknown> = {},
) {
  const step = workflows[file].jobs[job].steps.find(
    (s: Step) => s.id === id || s.name === id,
  );
  const outputs: Record<string, unknown> = {};
  const core = {
    setOutput: (name: string, value: unknown) => {
      outputs[name] = value;
    },
    info: vi.fn(),
    error: vi.fn(),
    setFailed: vi.fn(),
    warning: vi.fn(),
    summary: { addRaw: vi.fn().mockReturnThis(), write: vi.fn() },
  };
  const process = {
    env,
    stdout: { write: vi.fn() },
    stderr: { write: vi.fn() },
  };
  await new AsyncFunction(
    "core",
    "github",
    "context",
    "process",
    "require",
    step.with.script,
  )(
    core,
    mocks.github || {},
    mocks.context || { repo: { owner: "org", repo: "repo" } },
    process,
    mocks.require ||
      (() => {
        throw Error("Unexpected require");
      }),
  );
  return { outputs, core };
}

it("connects every local workflow and action using declared inputs and required arguments", () => {
  for (const [file, workflow] of Object.entries(workflows)) {
    expect(Object.keys(workflow.jobs).length, file).toBeGreaterThan(0);
    expect(workflow.description, file).toBeUndefined();
    for (const job of Object.values(workflow.jobs) as Job[]) {
      const entries = job.uses ? [job] : job.steps;
      for (const entry of entries) {
        if (!entry.uses?.startsWith("./")) continue;
        const callee = entry.uses.startsWith("./.github/workflows/")
          ? workflows[entry.uses.split("/").at(-1)!].on.workflow_call
          : actions[entry.uses.split("/").at(-1)!];
        expect(callee, `${file}: ${entry.uses}`).toBeTruthy();
        for (const key of Object.keys(entry.with || {}))
          expect(callee.inputs, key).toHaveProperty(key);
        for (const [key, input] of Object.entries(callee.inputs || {}) as [
          string,
          Input,
        ][]) {
          if (input.required && input.default === undefined)
            expect(entry.with, key).toHaveProperty(key);
        }
      }
    }
  }
  for (const [name, action] of Object.entries(actions)) {
    expect(action, name).toBeTruthy();
    if (action.runs.using === "composite") {
      for (const step of action.runs.steps) {
        if (step.uses?.startsWith("./.github/actions/"))
          expect(actions).toHaveProperty(step.uses.split("/").at(-1));
        if (step.run) expect(step.shell).toBeTruthy();
      }
      for (const output of Object.values(action.outputs || {}) as {
        value?: string;
      }[])
        expect(output.value).toBeTruthy();
    } else
      for (const key of ["main", "post"]) {
        if (action.runs[key])
          expect(
            existsSync(join(root, ".github/actions", name, action.runs[key])),
          ).toBe(true);
      }
  }
});
it("parses all embedded JavaScript and shell programs", () => {
  const groups = [
    ...Object.values(workflows).flatMap((w) => Object.values(w.jobs)),
    ...Object.values(actions).map((a) => a.runs),
  ] as { steps?: Step[] }[];
  for (const group of groups)
    for (const step of group.steps || []) {
      if (step.uses?.startsWith("actions/github-script@"))
        expect(
          () => new AsyncFunction(step.with!.script),
          step.name,
        ).not.toThrow();
      if (step.run) {
        const result = spawnSync("bash", ["-n"], {
          input: step.run.replace(/\$\{\{[\s\S]*?\}\}/g, "placeholder"),
          encoding: "utf8",
        });
        expect(result.status, `${step.name}: ${result.stderr}`).toBe(0);
      }
    }
});
const head = "a".repeat(40),
  base = "b".repeat(40);
it.each(["review", "pick"])(
  "rechecks %s PR head/base and routes a closed PR to cleanup",
  async (mode) => {
    const file = `review.${mode}-deploy.yml`,
      job = `${mode}-deploy`;
    for (const id of ["state", "final-state"])
      for (const [state, sha, baseSha, repo, expected] of [
        ["open", head, base, "org/repo", "deploy"],
        ["open", "c".repeat(40), base, "org/repo", "skip"],
        ["open", head, "c".repeat(40), "org/repo", "skip"],
        ["open", head, base, "fork/repo", "skip"],
        ["closed", head, base, "org/repo", "cleanup"],
      ]) {
        const result = await execute(
          file,
          job,
          id,
          {
            PR_NUMBER: "12",
            HEAD_SHA: head,
            BASE_SHA: base,
            GITHUB_REPOSITORY: "org/repo",
          },
          {
            github: {
              rest: {
                pulls: {
                  get: async () => ({
                    data: {
                      state,
                      head: { sha, repo: { full_name: repo } },
                      base: { sha: baseSha },
                    },
                  }),
                },
              },
            },
          },
        );
        expect(result.outputs.operation).toBe(expected);
      }
    const deploy = workflows[file].jobs[job].steps.find(
      (s: Step) => s.id === "deploy",
    );
    expect(deploy.if).toContain("final-state.outputs.operation == 'deploy'");
    expect(deploy.if).toContain("filter.outputs.has_hit == 'true'");
  },
);
it("falls back to full for a missing, zero, unknown or non-ancestor base", async () => {
  for (const [baseSha, status, expected] of [
    ["", 0, "false"],
    ["0".repeat(40), 0, "false"],
    [base, 128, "false"],
    [base, 1, "false"],
    [base, 0, "true"],
  ] as const) {
    const spawn = vi.fn().mockReturnValue({ status });
    const result = await execute(
      "update.update-deploy.yml",
      "updatability-check",
      "check",
      { CHANNEL: "staging", HEAD_SHA: head, BASE_SHA: baseSha },
      { require: () => ({ spawnSync: spawn }) },
    );
    expect(result.outputs.updatable).toBe(expected);
    if (!baseSha || /^0+$/.test(baseSha)) expect(spawn).not.toHaveBeenCalled();
  }
});
it("keeps direct changes separate from affected deployment candidates", async () => {
  const calls: string[][] = [];
  const result = await execute(
    "review.review-deploy.yml",
    "review-deploy",
    "selection",
    { HEAD_SHA: head, BASE_SHA: base },
    {
      require: () => ({
        execFileSync: (_cmd: string, args: string[]) => {
          calls.push(args);
          if (args[0] === "merge-base") return base;
          return JSON.stringify({
            packages: {
              items: (args.at(-1)?.startsWith("--filter=...")
                ? ["api", "web"]
                : ["api"]
              ).map((name) => ({ name })),
            },
          });
        },
      }),
    },
  );
  expect(JSON.parse(result.outputs.changes as string)).toEqual(["api"]);
  expect(JSON.parse(result.outputs.affected as string)).toEqual(["api", "web"]);
  expect(calls).toContainEqual([
    "exec",
    "turbo",
    "ls",
    "--output=json",
    `--filter=[${base}...${head}]`,
  ]);
});
it("reports partial deployment failure while still attempting all selected packages", async () => {
  const spawn = vi
    .fn()
    .mockReturnValueOnce({ status: 1, stdout: "failed", stderr: "error" })
    .mockReturnValueOnce({
      status: 0,
      stdout: "https://web-preview-pr-12.example.workers.dev",
    });
  const result = await execute(
    "review.pick-deploy.yml",
    "pick-deploy",
    "deploy",
    { TARGETS: JSON.stringify([{ package: "api" }, { package: "web" }]) },
    { require: () => ({ spawnSync: spawn }) },
  );
  expect(spawn).toHaveBeenCalledTimes(2);
  expect(spawn.mock.calls[0]![1]).toEqual([
    "exec",
    "turbo",
    "run",
    "deploy",
    "--only",
    "--filter=api",
  ]);
  expect(JSON.parse(result.outputs.results as string)).toEqual([
    { package: "api", success: false },
    {
      package: "web",
      success: true,
      url: "https://web-preview-pr-12.example.workers.dev",
    },
  ]);
  expect(result.core.setFailed).toHaveBeenCalled();
});
it("shares PR and channel concurrency without nested locking in the fallback", () => {
  for (const name of [
    "review.review-deploy.yml",
    "review.pick-deploy.yml",
    "review.clean-preview.yml",
  ]) {
    expect(workflows[name].concurrency).toEqual({
      group: "preview-pr-${{ inputs.pr_number }}",
      queue: "single",
      "cancel-in-progress": false,
    });
  }
  expect(workflows["update.full-deploy.yml"].concurrency).toEqual(
    workflows["update.update-deploy.yml"].jobs["update-deploy"].concurrency,
  );
  expect(workflows["update.update-deploy.yml"].concurrency).toBeUndefined();
});
it("denies preview comments without write permission before executing PR code", async () => {
  const get = vi.fn();
  await expect(
    execute(
      "on-pr-comment.yml",
      "receive",
      "request",
      { GITHUB_TRIGGERING_ACTOR: "reader" },
      {
        context: {
          repo: { owner: "org", repo: "repo" },
          payload: {
            comment: { body: "/preview api", user: { login: "reader" } },
          },
        },
        github: {
          rest: {
            repos: {
              getCollaboratorPermissionLevel: async () => ({
                data: { permission: "read" },
              }),
            },
            pulls: { get },
          },
        },
      },
    ),
  ).rejects.toThrow("write permission");
  expect(get).not.toHaveBeenCalled();
});

it("summarizes preparation failures even without deployment output, and tolerates notification failure", async () => {
  const comment = vi.fn().mockRejectedValue(Error("API unavailable"));
  const result = await execute(
    "review.review-deploy.yml",
    "review-deploy",
    "Summarize results",
    {
      JOB_STATUS: "failure",
      STEPS: JSON.stringify({ install: { outcome: "failure" } }),
      RESULTS: "[]",
      PR_NUMBER: "12",
      GITHUB_SERVER_URL: "https://github.com",
      GITHUB_REPOSITORY: "org/repo",
      GITHUB_RUN_ID: "123",
      DEPLOY_CHANNEL: "preview",
    },
    { github: { rest: { issues: { createComment: comment } } } },
  );
  expect(result.core.summary.addRaw).toHaveBeenCalledWith(
    expect.stringContaining("Failed steps: install"),
  );
  expect(result.core.summary.write).toHaveBeenCalled();
  expect(result.core.warning).toHaveBeenCalledWith(
    expect.stringContaining("API unavailable"),
  );
});
it("skips close-triggered cleanup after reopening, but honors an explicit manual cleanup", async () => {
  for (const [state, manual, expected] of [
    ["open", "false", "skip"],
    ["open", "true", "cleanup"],
    ["closed", "false", "cleanup"],
  ]) {
    const result = await execute(
      "review.clean-preview.yml",
      "cleanup",
      "state",
      { PR_NUMBER: "12", MANUAL: manual! },
      {
        github: { rest: { pulls: { get: async () => ({ data: { state } }) } } },
      },
    );
    expect(result.outputs.operation).toBe(expected);
  }
});
