import { Hono } from "hono";

const app = new Hono<{Bindings: CloudflareBindings}>();

app.get("/", (c) => {
  return c.text(`Hello Hono! this is ${c.env.SELF}`);
});

export default app;
