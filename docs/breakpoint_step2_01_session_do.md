# Prompt-plan Claude Code — BreakPoint · Étape 2.1 · Session Durable Object

> Construis le **control plane** de BreakPoint : un Cloudflare Worker + un Durable Object `SessionDO` qui détient l'identité de session, la machine à états, le relai temps réel WebSocket, et le nettoyage par TTL. Communication française, **tout le code en anglais**.

---

## Objectif & scope

Le DO est l'**arbitre du lifecycle** d'une rencontre ponctuelle entre **2 personnes**. Il ne fait **pas** la proximité (ça, c'est le BLE côté téléphone) — il *émet* le `bleUuid` que le natif consommera, relaie le GPS au loin, pis gère l'état autoritatif.

**Dans le scope (V1) :** création de session, join (max 2), machine à états, WebSocket par participant, relai GPS, distribution du `bleUuid` aux participants authentifiés, TTL via DO Alarms, reconnexion via le storage du DO.

**Hors scope (à ne PAS faire ici) :** logique BLE, la *décision* de tier (elle est pilotée par les capteurs du téléphone, le DO ne fait que la recevoir et la relayer), 3+ participants, comptes/auth utilisateur, persistance d'historique, base de données externe.

---

## Stack & structure

- Cloudflare Workers + Durable Objects, TypeScript, `wrangler`.
- **Hono** pour le routing HTTP dans le Worker.
- Storage : uniquement le storage interne du DO (pas de D1/KV pour le V1).

```
src/
  index.ts        # Worker : routes Hono -> forward vers le DO
  session-do.ts   # la classe SessionDO
  types.ts        # types partagés + protocole de messages
wrangler.toml     # binding du DO + migration
```

---

## Modèle de données (storage du DO)

Un seul record `session` :

```ts
type ParticipantRole = "initiator" | "joiner";

interface Participant {
  role: ParticipantRole;
  participantToken: string;  // secret pour authentifier la connexion WS
  connected: boolean;
  lastGps?: { lat: number; lng: number; accuracy: number; bearing?: number; at: number };
  tier?: "far" | "close" | "very_close" | "social";
}

interface SessionRecord {
  sessionId: string;
  sessionToken: string;     // secret racine
  bleUuid: string;          // 128-bit UUID dérivé du sessionToken, distribué seulement par WS
  joinCode: string;         // 6 caractères lisibles (ex. K7P2QX)
  joinCapability: string;   // secret haute entropie porté par le lien/QR
  state: SessionState;
  createdAt: number;
  joinTtlAt: number;        // expiration si personne ne join
  maxLifetimeAt: number;    // durée de vie max
  initiator: Participant;
  joiner?: Participant;
}

type SessionState =
  | "created" | "active_gps" | "active_ble" | "social_handoff"
  | "ended" | "expired" | "cancelled" | "abandoned";
```

---

## Machine à états (le DO est autoritatif)

- `created` → `active_gps` : le joiner rejoint.
- `created` → `expired` : alarme `joinTtlAt` atteinte, personne joint.
- `created` → `cancelled` : l'initiator annule.
- `active_gps`/`active_ble`/`social_handoff` → `ended` : confirmation « met » d'un participant.
- toute phase active → `abandoned` : un participant quitte (`leave`) ou déconnexion permanente.
- n'importe quel état actif → `expired` : alarme `maxLifetimeAt`.

> Note importante : `active_gps` → `active_ble` → `social_handoff` sont **pilotés par les `tier` reportés par les téléphones**, pas décidés par le DO. Le DO met juste à jour `state` à partir du tier le plus avancé des deux participants et le relaie. Le DO ne calcule **aucune** proximité.

---

## Endpoints HTTP (Worker → DO)

Génère un `sessionId` random, route vers le DO via `env.SESSION_DO.idFromName(sessionId)`.

- `POST /sessions`
  → spawn le DO, génère `sessionToken`, dérive `bleUuid`, génère `joinCode` + `joinCapability` + le `participantToken` de l'initiator, arme les alarmes.
  → **retourne** : `{ sessionId, joinCode, joinUrl, participantToken (initiator) }`.
  → le `joinUrl`/QR encode `sessionId` + `joinCapability` (jamais le `bleUuid`).

- `POST /sessions/:id/join`  (body : `{ joinCapability }` ou résolution via `joinCode`)
  → valide : session existe, pas expirée, **pas déjà pleine**, capability/code valide.
  → assigne le rôle `joiner`, génère son `participantToken`, transition `created → active_gps`.
  → **retourne** : `{ sessionId, participantToken (joiner) }`.

- `GET /sessions/:id/ws`  (Upgrade: websocket, header/query `participantToken`)
  → valide le `participantToken`, accepte la connexion, marque le participant `connected`.

---

## Protocole WebSocket

**Client → serveur :**
```ts
{ type: "gps", lat, lng, accuracy, bearing? }
{ type: "tier", tier: "far" | "close" | "very_close" | "social" }
{ type: "leave" }
{ type: "met" }            // confirme le moment social -> ended
```

**Serveur → client :**
```ts
{ type: "session", bleUuid, peerPresent, state }   // 1er message à la connexion (livre le bleUuid)
{ type: "peerJoined" }
{ type: "peerGps", lat, lng, accuracy, bearing?, at }
{ type: "peerTier", tier }
{ type: "state", state }
{ type: "peerLeft" }
{ type: "ended", reason }
```

Le DO relaie GPS/tier d'un participant vers l'autre, met à jour `state` quand un tier avance, pis broadcast les changements d'état.

---

## Sécurité

- `joinCapability` : secret haute entropie (≥128 bits) dans le lien/QR.
- `joinCode` : 6 caractères → entropie faible, **couvert par** TTL court (`joinTtlAt`) + **usage unique** (mort dès le 1er join, session pleine) + rate limiting sur `/join`.
- `participantToken` validé à chaque connexion WS.
- `bleUuid` distribué **uniquement** dans le 1er message WS d'un participant authentifié — jamais dans un lien partageable.

---

## Alarmes / TTL (DO Alarms)

- `joinTtlAt` (ex. **5 min**) : si encore `created` → `expired`, ferme tout.
- `maxLifetimeAt` (ex. **60 min**) : force `ended`/cleanup peu importe l'état.
- Si les deux participants restent déconnectés au-delà d'un délai de grâce (ex. 90 s) en phase active → `abandoned`/cleanup.

---

## Reconnexion

Le storage du DO persiste l'état. Un participant qui perd sa connexion peut se reconnecter avec son `participantToken` tant que la session est vivante (le DO le re-marque `connected` pis renvoie un `{ type: "session", ... }`).

---

## Détails d'implémentation à respecter

- Utilise la **WebSocket Hibernation API** des DO (`state.acceptWebSocket(ws)` + handlers `webSocketMessage`/`webSocketClose`) — les streams GPS sont intermittents, ça coupe les coûts d'idle.
- Secrets via `crypto.getRandomValues` / `crypto.randomUUID`.
- `bleUuid` : génère 16 bytes random, formate-les en string UUID 128-bit (`xxxxxxxx-xxxx-...`) pour que le natif puisse l'advertiser tel quel.
- `joinCode` : alphabet sans caractères ambigus (pas de O/0, I/1).

---

## Critères de réussite (testables sans téléphone)

1. `create` → `join` → les deux WS connectent → un `gps` d'un côté arrive en `peerGps` de l'autre.
2. `join` avec mauvaise `joinCapability` → rejeté.
3. 3e `join` → rejeté (session pleine).
4. Aucune jonction avant `joinTtlAt` → l'alarme passe la session en `expired`.
5. `leave` d'un participant → l'autre reçoit `peerLeft`, état `abandoned`.
6. Drop d'un WS puis reconnexion avec le même `participantToken` → reprise propre, état préservé.
7. Le `bleUuid` n'apparaît **jamais** dans le `joinUrl` ni la réponse de `/join` — seulement dans le 1er message WS.

Écris un petit script de test (Node ou un `.http`) qui couvre 1–7.