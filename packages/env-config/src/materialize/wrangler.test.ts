import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RuntimeVariables } from "../config-file/runtime.yaml.js";

const wranglerMock = vi.hoisted(() => ({
  exists: vi.fn(),
  read: vi.fn(),
  generate: vi.fn(),
}));

vi.mock("../config-file/wrangler.jsonc.js", () => ({
  wranglerJsonc: wranglerMock,
}));

import { generateWranglerJsonc } from "./wrangler.js";

const runtimeConfigData: RuntimeVariables = {
  globals: {
    local: {},
    release: { RUNTIME: "release", SHARED: "global" },
    staging: { RUNTIME: "staging", SHARED: "global" },
  },
  apps: {
    local: {},
    release: { SHARED: "app-release" },
    staging: { SHARED: "app-staging" },
  },
};

const sourceConfig = {
  name: "worker",
  compatibility_date: "2026-01-01",
  vars: { BASE: "base", SHARED: "base" },
  services: [
    { binding: "API", service: "api" },
    { binding: "AUTH", service: "auth" },
  ],
  env: {
    staging: {
      name: "ignored-staging-name",
      vars: { CHANNEL: "staging", SHARED: "env-staging" },
    },
    release: {
      name: "ignored-release-name",
      vars: { CHANNEL: "release", SHARED: "env-release" },
    },
  },
};

describe("generateWranglerJsonc", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    wranglerMock.exists.mockReturnValue(true);
    wranglerMock.read.mockReturnValue(structuredClone(sourceConfig));
  });

  it("does nothing when wrangler.jsonc does not exist", () => {
    wranglerMock.exists.mockReturnValue(false);

    generateWranglerJsonc(runtimeConfigData, "staging", 0, []);

    expect(wranglerMock.read).not.toHaveBeenCalled();
    expect(wranglerMock.generate).not.toHaveBeenCalled();
  });

  it.each([
    ["staging", "worker-staging", "staging", "app-staging"],
    ["release", "worker-release", "release", "app-release"],
  ] as const)(
    "flattens the %s environment and applies runtime overrides",
    (channel, expectedName, expectedChannel, expectedShared) => {
      generateWranglerJsonc(runtimeConfigData, channel, 0, []);

      expect(wranglerMock.generate).toHaveBeenCalledWith({
        name: expectedName,
        compatibility_date: "2026-01-01",
        vars: {
          BASE: "base",
          CHANNEL: expectedChannel,
          SHARED: expectedShared,
          RUNTIME: expectedChannel,
        },
        services: sourceConfig.services,
      });
    },
  );

  it("uses staging values for preview and renames selected services", () => {
    generateWranglerJsonc(runtimeConfigData, "preview", 123, ["api"]);

    expect(wranglerMock.generate).toHaveBeenCalledWith({
      name: "worker-preview-pr-123",
      compatibility_date: "2026-01-01",
      vars: {
        BASE: "base",
        CHANNEL: "staging",
        SHARED: "app-staging",
        RUNTIME: "staging",
      },
      services: [
        { binding: "API", service: "api-preview-pr-123" },
        { binding: "AUTH", service: "auth" },
      ],
    });
  });
});
