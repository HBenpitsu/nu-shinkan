import { describe, expect, it } from "vitest";
import { testExport } from "./dotenv.js";
describe("dotenv patch", () => {
  it("patches existing keys and appends new keys", () => {
    const original = `
EXISTING=old
`;
    const values = {
      EXISTING: "updated",
      NEW_KEY: "added",
    };
    const patched = testExport.patch(original, values);
    expect(patched).toContain("EXISTING=updated");
    expect(patched).toContain("NEW_KEY=added");
  });
  it("ignores comments and empty lines", () => {
    const original = `# This is a comment

EXISTING=old`;
    const values = {
      EXISTING: "updated",
      NEW_KEY: "added",
    };
    const patched = testExport.patch(original, values);
    const lines = patched.split("\n");
    expect(lines[0]).toBe("# This is a comment");
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe("EXISTING=updated");
    expect(lines[3]).toBe("NEW_KEY=added");
  });
});
