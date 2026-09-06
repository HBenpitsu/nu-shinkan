import { expect, it } from "vitest";
import { parseCommand, prNumber, operation } from "./request.js";
it("recognizes exact commands only", () => {
  expect(parseCommand("/preview a b")).toEqual(["a", "b"]);
  expect(parseCommand("/preview")).toEqual([]);
  expect(parseCommand("/preview-other a")).toBeUndefined();
});
it.each(["0", "1.5", "01", "1\n", "-2", "abc"])("rejects PR %s", (pr) =>
  expect(() => prNumber(pr)).toThrow(),
);
it.each([
  ["deploy", "open", "deploy"],
  ["deploy", "closed", "cleanup"],
  ["close", "open", "skip"],
  ["close", "closed", "cleanup"],
  ["delete", "open", "cleanup"],
  ["delete", "closed", "cleanup"],
] as const)("%s on %s -> %s", (request, state, result) =>
  expect(operation(request, state)).toBe(result),
);
