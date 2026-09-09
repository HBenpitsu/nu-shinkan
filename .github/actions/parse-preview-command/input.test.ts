import { expect, it } from "vitest";
import { parsePreviewCommand, checkExistence } from "./input.mjs";

it("parses only exact package picks and validates Turbo's actual listing shape", () => {
  expect(
    parsePreviewCommand("/preview @repo/api\n@repo/web @repo/api"),
  ).toEqual(["@repo/api", "@repo/web"]);
  for (const body of [
    "/preview",
    "/previewed api",
    "/preview *",
    "/preview ...api",
    "/preview --filter=api",
  ]) {
    expect(() => parsePreviewCommand(body)).toThrow();
  }
  expect(
    checkExistence(["api"], { packages: { items: [{ name: "api" }] } }),
  ).toEqual(["api"]);
  expect(() =>
    checkExistence(["missing"], { packages: { items: [{ name: "api" }] } }),
  ).toThrow("Unknown packages");
  expect(() => checkExistence(["api"], [])).toThrow("Invalid Turbo");
});
