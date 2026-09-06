type Fetcher = { fetch(request: Request): Promise<Response> };
export default {
  async fetch(
    request: Request,
    env: { DUMMY_PREVIEW_API: Fetcher; ASSETS: Fetcher },
  ): Promise<Response> {
    if (new URL(request.url).pathname === "/__connection") {
      return env.DUMMY_PREVIEW_API.fetch(
        new Request("https://binding/", request),
      );
    }
    return env.ASSETS.fetch(request);
  },
};
