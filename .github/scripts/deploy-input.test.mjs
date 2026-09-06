import { test } from "node:test";
import assert from "node:assert/strict";
import { packages } from "./turbo-parse.mjs";
import { validatePicks } from "../actions/pick-deploy/check.mjs";
import { parseCommand } from "../actions/pick-deploy/parse.mjs";
import { prNumber } from "./github.mjs";
test("Turbo malformed output is not empty selection", () => {
  assert.deepEqual(packages({ packages: { items: [] } }), []);
  assert.throws(() => packages({}));
  assert.throws(() => packages({ packages: { items: [null] } }));
});
test("pick accepts exact names and reports a valid correction", () => {
  const all = [{ package: "api", path: "apps/api" }];
  assert.deepEqual(validatePicks(["api", "api"], all), ["api"]);
  assert.throws(
    () => validatePicks(["api", "...api"], all),
    /Try: \/preview api/,
  );
  assert.throws(() => validatePicks([], all));
  assert.deepEqual(parseCommand("/preview api"), ["api"]);
  assert.equal(parseCommand("/preview-other api"), undefined);
});
test("PR number must be positive and safe", () => {
  assert.equal(prNumber("12"), 12);
  for (const value of ["0", "-1", "1.5", "12\n", "9007199254740992"])
    assert.throws(() => prNumber(value));
});
