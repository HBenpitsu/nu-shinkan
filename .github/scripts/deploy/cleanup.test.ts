import { afterEach, expect, it, vi } from "vitest";
import { cleanup, ownedWorker } from "./cleanup.js";
afterEach(() => vi.unstubAllEnvs());
it("matches exact PR ownership suffix only", () => {
  expect(ownedWorker("old-api-preview-pr-12", 12)).toBe(true);
  for (const name of [
    "api-staging",
    "api-release",
    "api-preview-pr-123",
    "api-preview-pr-12-extra",
  ])
    expect(ownedWorker(name, 12)).toBe(false);
});
function credentials() {
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "test");
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "test");
}
it("does not treat listing failure as empty", async () => {
  credentials();
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ success: false }), { status: 403 }),
    );
  await expect(cleanup(12, fetcher)).rejects.toThrow("listing failed");
  expect(fetcher).toHaveBeenCalledOnce();
});
it("continues after failures and tolerates resources already deleted", async () => {
  credentials();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          result: [
            { id: "old-preview-pr-12" },
            { id: "api-staging" },
            { id: "new-preview-pr-12" },
          ],
        }),
      ),
    )
    .mockResolvedValueOnce(new Response("{}", { status: 500 }))
    .mockResolvedValueOnce(new Response("", { status: 404 }));
  const results = await cleanup(12, fetcher);
  expect(results.map((r) => r.status)).toEqual(["failure", "deleted"]);
  expect(fetcher).toHaveBeenCalledTimes(4);
});

it("retries blocked callees after deleting callers", async () => {
  credentials();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        success: true,
        result: [{ id: "api-preview-pr-12" }, { id: "web-preview-pr-12" }],
      }),
    )
    .mockResolvedValueOnce(Response.json({ success: false }, { status: 409 }))
    .mockResolvedValueOnce(Response.json({ success: true }))
    .mockResolvedValueOnce(Response.json({ success: true }));
  expect((await cleanup(12, fetcher)).map((r) => r.status)).toEqual([
    "deleted",
    "deleted",
  ]);
  expect(fetcher).toHaveBeenCalledTimes(4);
});
