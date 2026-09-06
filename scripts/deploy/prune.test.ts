import { expect, it, vi } from "vitest";
import { prune } from "./prune.js";
it("deletes the exact PR Worker with force", async () => {
  const fetcher = vi.fn<typeof fetch>(
    async () => new Response(null, { status: 204 }),
  );
  expect(await prune("api", "12", "account", "token", fetcher)).toEqual({
    worker: "api-preview-pr-12",
    status: "deleted",
  });
  expect(fetcher.mock.calls[0]?.[0]).toBe(
    "https://api.cloudflare.com/client/v4/accounts/account/workers/scripts/api-preview-pr-12?force=true",
  );
});
it("normalizes missing Worker but propagates other failures", async () => {
  const reply = (status: number, code: number) => async () =>
    new Response(JSON.stringify({ errors: [{ code }] }), { status });
  expect(
    (await prune("api", "12", "account", "token", reply(404, 10007))).status,
  ).toBe("absent");
  await expect(
    prune("api", "12", "account", "token", reply(404, 10000)),
  ).rejects.toThrow();
  await expect(
    prune("api", "12", "account", "token", reply(403, 10000)),
  ).rejects.toThrow();
});
it("rejects invalid scope before any request", async () => {
  const fetcher = vi.fn();
  await expect(
    prune("api", "0", "account", "token", fetcher),
  ).rejects.toThrow();
  await expect(
    prune("../api", "12", "account", "token", fetcher),
  ).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
