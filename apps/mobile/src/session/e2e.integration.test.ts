import { describe, it, expect, afterAll } from 'vitest';

import {
  createSession,
  joinSession,
  setBaseUrl,
  getBaseUrl,
} from './api';
import { parseJoinUrl } from './joinLink';
import { ProximityPipeline } from './proximityPipeline';
import { SessionWsClient } from './wsClient';

import type { ServerMessage, Tier } from '@breakpoint/protocol';

// Guard against shells (Git Bash/MSYS) that mangle a URL passed via env.
const BASE = process.env.BASE_URL?.startsWith('http')
  ? process.env.BASE_URL
  : 'http://127.0.0.1:8787';
setBaseUrl(BASE);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A simulated phone: real WS client + message collector. */
class Phone {
  readonly client: SessionWsClient;
  readonly msgs: ServerMessage[] = [];
  private waiters: { pred: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void }[] = [];

  constructor(sessionId: string, participantToken: string) {
    this.client = new SessionWsClient({
      sessionId,
      participantToken,
      onMessage: (m) => {
        this.msgs.push(m);
        this.waiters = this.waiters.filter((w) => {
          if (w.pred(m)) {
            w.resolve(m);
            return false;
          }
          return true;
        });
      },
      reconnect: false,
    });
  }

  waitFor(pred: (m: ServerMessage) => boolean, ms = 10_000): Promise<ServerMessage> {
    const existing = this.msgs.find(pred);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout waiting for message')), ms);
      this.waiters.push({
        pred,
        resolve: (m) => {
          clearTimeout(t);
          resolve(m);
        },
      });
    });
  }
}

describe('2.3 end-to-end: two phones over a live Session DO', () => {
  const phones: Phone[] = [];

  afterAll(() => {
    for (const p of phones) p.client.close();
  });

  it('drives create → join → gps relay → rising proximity → tier convergence', async () => {
    // --- create + join (control plane) ---
    const created = await createSession();
    const sessionId = created.sessionId;
    // Capability is in the URL fragment (security); parse it from there.
    const capability = parseJoinUrl(created.joinUrl)!.capability;
    const joined = await joinSession(sessionId, capability);

    // --- two WS connections (two phones) ---
    const phoneA = new Phone(sessionId, created.participantToken); // initiator
    const phoneB = new Phone(sessionId, joined.participantToken); // joiner
    phones.push(phoneA, phoneB);
    phoneA.client.connect();
    phoneB.client.connect();

    const sessA = await phoneA.waitFor((m) => m.type === 'session');
    const sessB = await phoneB.waitFor((m) => m.type === 'session');
    const bleUuidA = sessA.type === 'session' ? sessA.bleUuid : '';
    const bleUuidB = sessB.type === 'session' ? sessB.bleUuid : '';

    // bleUuid comes ONLY from the WS session frame, and both phones agree.
    expect(bleUuidA).toMatch(/^[0-9a-f-]{36}$/);
    expect(bleUuidA).toBe(bleUuidB);
    expect(created.joinUrl).not.toContain(bleUuidA);
    expect(JSON.stringify(created)).not.toContain(bleUuidA);
    expect(JSON.stringify(joined)).not.toContain(bleUuidA);

    // --- both stream GPS, each receives the other's peerGps ---
    phoneA.client.sendGps({ lat: 45.5019, lng: -73.5674, accuracy: 8 });
    phoneB.client.sendGps({ lat: 45.5025, lng: -73.5669, accuracy: 9 });

    const peerGpsAtA = await phoneA.waitFor((m) => m.type === 'peerGps');
    const peerGpsAtB = await phoneB.waitFor((m) => m.type === 'peerGps');
    expect(peerGpsAtA.type === 'peerGps' && peerGpsAtA.lat).toBe(45.5025); // A sees B
    expect(peerGpsAtB.type === 'peerGps' && peerGpsAtB.lat).toBe(45.5019); // B sees A

    // --- inject a rising proximity signal on phone A ---
    // Real BLE is no-op on web; here we push mocked RSSI through the SAME
    // pipeline the engine uses, and report tier changes to the DO.
    const reportedTiers: Tier[] = [];
    const pipeline = new ProximityPipeline({
      onTierChange: (tier) => {
        reportedTiers.push(tier);
        phoneA.client.sendTier(tier);
      },
    });

    const ramp = [
      -86, -82, -78, -74, -70, -66, -62, -58, -54, -50, -47, -45, -44, -43,
      -42, -42, -42, -42, -42, -42,
    ];
    const t0 = 1_000_000;
    for (let i = 0; i < ramp.length; i++) {
      pipeline.push({ rssi: ramp[i]!, at: t0 + i * 150 });
      await sleep(15); // let WS frames flush in order
    }

    // Phone A's locally-decided tier climbed to social.
    expect(pipeline.tier).toBe('social');
    expect(reportedTiers).toContain('very_close');
    expect(reportedTiers[reportedTiers.length - 1]).toBe('social');

    // --- the DO followed the most advanced tier and relayed it to phone B ---
    const peerTierAtB = await phoneB.waitFor(
      (m) => m.type === 'peerTier' && m.tier === 'social',
    );
    expect(peerTierAtB.type === 'peerTier' && peerTierAtB.tier).toBe('social');

    // Phone B saw the session state walk active_gps → active_ble → social_handoff.
    await phoneB.waitFor((m) => m.type === 'state' && m.state === 'active_ble');
    await phoneB.waitFor((m) => m.type === 'state' && m.state === 'social_handoff');

    // Authoritative truth from the DO converges too.
    const status = await fetch(`${getBaseUrl()}/sessions/${sessionId}`).then((r) => r.json());
    expect(status.state).toBe('social_handoff');
  }, 30_000);
});
