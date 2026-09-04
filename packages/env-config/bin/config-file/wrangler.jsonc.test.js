import { describe, expect, it } from "vitest";
import { testExport } from "./wrangler.jsonc.js";
import { parse as parseJsonc } from "jsonc-parser";
describe("wrangler.jsonc patch", () => {
  it("applies patches correctly", () => {
    const original = `{
  // keep this comment
  "name": "demo",
  "vars": {
    "EXISTING": "old",
    "OVERWRITE": "old"
  }
}`;
    const values = {
      name: "updated",
      vars: {
        NEW_ENV: "added",
        OVERWRITE: "updated",
      },
      NEW_BINDING: "added",
    };
    const patched = testExport.patch(original, values);
    expect(patched).toContain("// keep this comment");
    expect(patched).toContain('"name": "updated"');
    expect(patched).toContain('"NEW_BINDING": "added"');
    expect(parseJsonc(patched)["vars"]["EXISTING"]).toBe("old");
    expect(parseJsonc(patched)["vars"]["OVERWRITE"]).toBe("updated");
    expect(parseJsonc(patched)["vars"]["NEW_ENV"]).toBe("added");
  });
});
