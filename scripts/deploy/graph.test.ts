import { expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { reviewTargets } from "./graph.js";
vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));
it("passes build JSON to select and returns its targets", () => {
  const target = { package: "api", path: "apps/api" };
  vi.mocked(execFileSync)
    .mockReturnValueOnce('{"graph":true}')
    .mockReturnValueOnce(JSON.stringify([target]));
  expect(reviewTargets([target])).toEqual([target]);
  expect(execFileSync).toHaveBeenLastCalledWith(
    "pnpm",
    [
      "exec",
      "tsx",
      "scripts/connection-graph/select.ts",
      "--graph",
      "-",
      "--",
      "api",
    ],
    expect.objectContaining({ input: '{"graph":true}' }),
  );
});
it("propagates CLI failures", () => {
  vi.mocked(execFileSync).mockImplementationOnce(() => {
    throw new Error("build failed");
  });
  expect(() => reviewTargets([])).toThrow("build failed");
});
