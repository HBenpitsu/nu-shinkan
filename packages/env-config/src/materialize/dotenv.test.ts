import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RuntimeVariables } from "../config-file/runtime.yaml.js";

const dotenvMock = vi.hoisted(() => ({
  exists: vi.fn(),
  read: vi.fn(),
  generate: vi.fn(),
  prefix: vi.fn((values: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key.startsWith("VITE_") ? key : `VITE_${key}`,
        value,
      ]),
    ),
  ),
}));

vi.mock("../config-file/dotenv.js", () => ({ dotenv: dotenvMock }));

import { generateDotenv } from "./dotenv.js";

const runtimeConfigData: RuntimeVariables = {
  globals: {
    local: {},
    release: { API_URL: "https://release.example.com", SHARED: "global" },
    staging: { API_URL: "https://staging.example.com", SHARED: "global" },
  },
  apps: {
    local: {},
    release: { SHARED: "app-release" },
    staging: { SHARED: "app-staging" },
  },
};

describe("generateDotenv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dotenvMock.exists.mockReturnValue(true);
    dotenvMock.read.mockReturnValue({
      VITE_EXISTING: "preserved",
      BIND_API: "api",
      BIND_AUTH: "auth",
    });
  });

  it("does nothing when the source dotenv file does not exist", () => {
    dotenvMock.exists.mockReturnValue(false);

    generateDotenv(runtimeConfigData, "staging", undefined, []);

    expect(dotenvMock.read).not.toHaveBeenCalled();
    expect(dotenvMock.generate).not.toHaveBeenCalled();
  });

  it("merges channel overrides and lets app values override globals", () => {
    generateDotenv(runtimeConfigData, "release", undefined, []);

    expect(dotenvMock.generate).toHaveBeenCalledWith({
      VITE_EXISTING: "preserved",
      BIND_API: "api",
      BIND_AUTH: "auth",
      VITE_API_URL: "https://release.example.com",
      VITE_SHARED: "app-release",
    });
  });

  it("renames only selected preview service bindings", () => {
    generateDotenv(runtimeConfigData, "preview", 123, ["api"]);

    expect(dotenvMock.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        BIND_API: "api-preview-pr-123",
        BIND_AUTH: "auth",
      }),
    );
  });
});
