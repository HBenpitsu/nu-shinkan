import { Hono } from "hono";
import { ORGANIZATION_USER_SERVICE_WORKER } from "./interface";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/", (c) => {
  return c.text(`Hello Hono! this is ${c.env.SELF}`);
});

app.get("/users/summary", () => {
  return Response.json({
    worker: ORGANIZATION_USER_SERVICE_WORKER,
    status: "ok",
  });
});

export default app;
