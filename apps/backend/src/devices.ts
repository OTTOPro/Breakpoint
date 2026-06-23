import type { Hono } from "hono";

/**
 * Anonymous device identity (V2 Phase 1). D1-backed, additive — the DO/session
 * is untouched. No auth, no email, no PII.
 *
 * - deviceId: public, client-generated handle.
 * - deviceSecret: server-issued at first registration, returned ONCE; only its
 *   SHA-256 hash is stored. Proves ownership for mutations.
 */

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** A high-entropy secret (32 random bytes, hex). */
function randomSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return toHex(digest);
}

interface DeviceRow {
  deviceId: string;
  displayName: string | null;
  secretHash: string;
  createdAt: number;
  lastSeenAt: number;
}

export function registerDeviceRoutes(app: Hono<{ Bindings: Env }>): void {
  /**
   * Register (or re-announce) a device.
   * First call → create the row + issue a deviceSecret (returned once).
   * Later calls → just bump lastSeenAt (no secret, no name change here).
   */
  app.post("/devices/register", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as {
      deviceId?: string;
      displayName?: string;
    };
    const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : "";
    if (!deviceId) return c.json({ error: "missing_deviceId" }, 400);

    const now = Date.now();
    const existing = await c.env.DB.prepare(
      "SELECT deviceId FROM devices WHERE deviceId = ?",
    )
      .bind(deviceId)
      .first<{ deviceId: string }>();

    if (existing) {
      await c.env.DB.prepare("UPDATE devices SET lastSeenAt = ? WHERE deviceId = ?")
        .bind(now, deviceId)
        .run();
      return c.json({ deviceId, registered: true });
    }

    const deviceSecret = randomSecret();
    const secretHash = await sha256Hex(deviceSecret);
    await c.env.DB.prepare(
      "INSERT INTO devices (deviceId, displayName, secretHash, pushToken, createdAt, lastSeenAt) VALUES (?, ?, ?, NULL, ?, ?)",
    )
      .bind(deviceId, body.displayName ?? null, secretHash, now, now)
      .run();

    // deviceSecret is returned ONCE; the server keeps only its hash.
    return c.json({ deviceId, deviceSecret, registered: true });
  });

  /**
   * Update a device's displayName. Requires the matching deviceSecret.
   */
  app.post("/devices/update", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as {
      deviceId?: string;
      deviceSecret?: string;
      displayName?: string;
    };
    const deviceId = typeof body.deviceId === "string" ? body.deviceId.trim() : "";
    if (!deviceId) return c.json({ error: "missing_deviceId" }, 400);
    if (!body.deviceSecret) return c.json({ error: "missing_secret" }, 401);

    const row = await c.env.DB.prepare(
      "SELECT secretHash FROM devices WHERE deviceId = ?",
    )
      .bind(deviceId)
      .first<Pick<DeviceRow, "secretHash">>();
    if (!row) return c.json({ error: "not_found" }, 404);

    const providedHash = await sha256Hex(body.deviceSecret);
    if (providedHash !== row.secretHash) {
      return c.json({ error: "invalid_secret" }, 403);
    }

    await c.env.DB.prepare(
      "UPDATE devices SET displayName = ?, lastSeenAt = ? WHERE deviceId = ?",
    )
      .bind(body.displayName ?? null, Date.now(), deviceId)
      .run();
    return c.json({ deviceId, ok: true });
  });
}
