import { Hono } from "hono";
import { DUMMY_PREVIEW_API_WORKER } from "./interface";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/", (c) => {
  return c.text(`Hello Hono! this is ${c.env.SELF}`);
});

app.get("/health", (c) => {
  return c.json({
    worker: DUMMY_PREVIEW_API_WORKER,
    message: "dummy backend is reachable",
  });
});

export default app;
