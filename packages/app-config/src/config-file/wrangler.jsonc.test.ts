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
  },
  "services": [
    {
      "binding": "A",
      "service": "old"
    },
    {
      "binding": "B",
      "service": "old"
    }
  ]
}`;
    const values = {
      name: "updated",
      vars: {
        NEW_ENV: "added",
        OVERWRITE: "updated",
      },
      services: [
        {
          binding: "B",
          service: "new",
        },
        {
          binding: "C",
          service: "new",
        },
      ],
      NEW_BINDING: "added",
    };
    const patched = testExport.patch(original, values);
    expect(patched).toContain("// keep this comment");
    expect(patched).toContain('"name": "updated"');
    expect(patched).toContain('"NEW_BINDING": "added"');

    expect(parseJsonc(patched)["vars"]["EXISTING"]).toBe("old");
    expect(parseJsonc(patched)["vars"]["OVERWRITE"]).toBe("updated");
    expect(parseJsonc(patched)["vars"]["NEW_ENV"]).toBe("added");

    expect(parseJsonc(patched)["services"]).toHaveLength(3);
    expect(parseJsonc(patched)["services"][0]["binding"]).toBe("A");
    expect(parseJsonc(patched)["services"][0]["service"]).toBe("old");
    expect(parseJsonc(patched)["services"][1]["binding"]).toBe("B");
    expect(parseJsonc(patched)["services"][1]["service"]).toBe("new");
    expect(parseJsonc(patched)["services"][2]["binding"]).toBe("C");
    expect(parseJsonc(patched)["services"][2]["service"]).toBe("new");
  });
});
