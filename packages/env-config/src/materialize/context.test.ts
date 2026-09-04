import { describe, expect, it } from "vitest";
import { validateContext } from "./context.js";

describe("validateContext", () => {
  it.each(["staging", "release"] as const)(
    "accepts %s without a pull request number",
    (channel) => {
      expect(validateContext(channel, undefined)).toBe(true);
    },
  );

  it("requires a non-negative pull request number for preview", () => {
    expect(validateContext("preview", undefined)).toBe(false);
    expect(validateContext("preview", -1)).toBe(false);
    expect(validateContext("preview", 0)).toBe(true);
    expect(validateContext("preview", 42)).toBe(true);
  });

  it("rejects unsupported deployment channels", () => {
    expect(validateContext("production" as never, 42)).toBe(false);
  });
});
