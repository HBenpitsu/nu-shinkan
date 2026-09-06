import { expect, it } from "vitest";
import { taskArgs, runTask } from "./run.js";
it("never runs unfiltered tasks for empty selection", () => {
  expect(taskArgs("deploy", [])).toBeUndefined();
  expect(() => runTask("deploy", [])).not.toThrow();
});
it("uses literal argv and disables dependency task expansion", () =>
  expect(
    taskArgs("test", [{ package: "@repo/api", path: "apps/api" }]),
  ).toEqual(["exec", "turbo", "run", "test", "--only", "--filter=@repo/api"]));
