import { expect, it } from "vitest";
import { resultFor } from "./results.js";
const pkg = { package: "web", path: "apps/web" };
it("never treats a URL as proof of success", () =>
  expect(
    resultFor(pkg, true, {}, "https://web.workers.dev", { assets: {} }).status,
  ).toBe("failure"));
it("accepts successful exit even without a parsed URL", () =>
  expect(
    resultFor(
      pkg,
      true,
      {
        tasks: [{ package: "web", task: "deploy", execution: { exitCode: 0 } }],
      },
      "",
    ).status,
  ).toBe("success"));
it("includes frontend URL only for success", () =>
  expect(
    resultFor(
      pkg,
      true,
      {
        tasks: [{ package: "web", task: "deploy", execution: { exitCode: 0 } }],
      },
      "https://web.workers.dev",
      { assets: {}, name: "web" },
    ),
  ).toMatchObject({ url: "https://web.workers.dev", worker: "web" }));
it("skips candidates without deploy", () =>
  expect(resultFor(pkg, false, {}, "").status).toBe("unnecessary"));
