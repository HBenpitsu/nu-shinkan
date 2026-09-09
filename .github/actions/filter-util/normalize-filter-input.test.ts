import { expect, it } from "vitest";
import { normalizeFilterInput } from "./normalize-filter-input.mjs";

it.each([
  ["@repo/api", ["@repo/api"]],
  ["--filter @repo/api", ["@repo/api"]],
  ["[main]", ["[main]"]],
  ["...[abc...def]", ["...[abc...def]"]],
  ["[abc...def]", ["[abc...def]"]],
  ['["--filter=@repo/api", "@repo/web"]', ["@repo/api", "@repo/web"]],
  ["@repo/api\n@repo/web", ["@repo/api", "@repo/web"]],
  ["@repo/api,@repo/web", ["@repo/api", "@repo/web"]],
  ["@repo/api @repo/web", ["@repo/api", "@repo/web"]],
  ["[]", []],
])("normalizes %s without losing single filters", (input, expected) => {
  expect(normalizeFilterInput(input)).toEqual(expected);
});
it.each(["[null]", "[1]", '["unterminated"'])(
  "rejects malformed filters %s",
  (input) => {
    expect(() => normalizeFilterInput(input)).toThrow();
  },
);
