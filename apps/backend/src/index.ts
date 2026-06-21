import { Hono } from "hono";
import { SessionDO } from "./session-do.js";

export { SessionDO };

const app = new Hono<{ Bindings: Env }>();

/** Liveness probe. */
app.get("/health", (c) => c.json({ ok: true }));

/**
 * Touches the Durable Object stub and returns its id — proves the binding is
 * wired end to end. (No state machine yet; see step 2.1.)
 */
app.get("/sessions/ping", async (c) => {
  const id = c.env.SESSION_DO.idFromName("ping");
  const stub = c.env.SESSION_DO.get(id);
  const res = await stub.fetch(new Request("https://do/ping"));
  const body = (await res.json()) as { id: string; state: string };
  return c.json({ ok: true, doId: body.id, doState: body.state });
});

export default app;
