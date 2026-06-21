# Prompt-plan Claude Code — BreakPoint · Étape 2.3 · Câblage de l'app

> Branche les morceaux ensemble : store de session, client WebSocket vers le DO, GPS, et l'**orchestrateur de tiers** qui combine GPS + proximité BLE. **Pas d'écrans** (Claude Design s'en occupe). Communication française, **code en anglais**. Entièrement testable gratis sur web.

---

## Objectif & scope

Faire tourner **le moteur de session de bout en bout**, sans UI : du `create`/`join` jusqu'à la progression des tiers, en branchant le DO (2.1) et le module BLE (2.2).

**Hors scope :** les écrans (→ Claude Design / 2.4), le styling, le vrai radio BLE (no-op sur web — on injecte des signaux mockés pour les tests).

---

## Décisions verrouillées (rappel)

- **Le BLE scanne dès le début de la session**, en parallèle du GPS.
- **C'est la physique qui décide du handoff** : tant que le BLE n'a pas de lock stable → guidage GPS (far) ; dès qu'il accroche → proximité (close/very_close/social).
- **Hystérésis** : promotion vers BLE sur lock stable (N échantillons récents dans une fenêtre T) ; rétrogradation vers GPS avec un délai de grâce, pour éviter le flapping de l'UI.
- Le téléphone **décide son tier local** et le **reporte au DO** ; le DO suit le tier le plus avancé (déjà fait en 2.1), il ne calcule aucune proximité.
- Le `bleUuid` vient **uniquement** du message WS `session` — on le fetch nulle part d'autre (propriété de sécurité de 2.1).

---

## API existante à brancher (ne pas réinventer)

- Module BLE (2.2) : `startProximity(sessionUuid)`, `stopProximity()`, `onPeerSignal(listener)` ; stub web no-op.
- Smoothing (2.2) : `computeProximity(samples) → { zone, trend, rssiSmoothed }`, `ProximityTracker`, `requestProximityPermissions()`.
- Protocole WS (2.1) — client→serveur : `gps`, `tier`, `leave`, `met` ; serveur→client : `session` (livre `bleUuid`), `peerJoined`, `peerGps`, `peerTier`, `state`, `peerLeft`, `ended`. Types dans `@breakpoint/protocol`.

---

## Ce qu'on bâtit (`apps/mobile/src/`)

- `session/api.ts` : `createSession()` (POST /sessions), `joinSession(sessionId, capability)` (POST /sessions/:id/join). Base URL configurable (pointe sur le `wrangler dev` local pour l'instant).
- `session/wsClient.ts` : ouvre `GET /sessions/:id/ws` avec le `participantToken`, envoie `gps`/`tier`/`leave`/`met`, dispatch les messages serveur, **reconnexion** automatique (le DO re-livre `bleUuid` + l'état).
- `session/store.ts` (Zustand) : état vivant — `sessionId`, `role`, `state`, `myGps`, `peerGps`, `proximity { zone, trend, rssiSmoothed }`, `connection`, `bleUuid`.
- `location/gps.ts` : échantillonnage via `expo-location` + helpers **purs** `haversineDistance(a, b)` et `bearing(a, b)` pour le tier far.
- `session/orchestrator.ts` : **le cerveau**. Entrées : lock BLE (échantillons récents), `proximity.zone`, distance/bearing GPS. Sortie : le **tier affiché** (far/close/very_close/social) selon les règles ci-dessus (lock stable + hystérésis). Reporte le tier au DO via le WS quand il change.
- **Glue de session** : sur `join` → ouvre le WS → au message `session`, récupère `bleUuid` → `startProximity(bleUuid)` → `onPeerSignal` alimente `ProximityTracker`/`computeProximity` → l'orchestrateur calcule le tier → reporté via WS. En parallèle, `expo-location` stream le GPS vers le haut.

> Pour les tests sur web (BLE no-op) : l'orchestrateur doit accepter une **source de signaux injectable**, pour qu'un test puisse pousser des RSSI mockés et faire jouer les transitions sans radio.

---

## Critères de réussite — Tier A (gratuit, prouvable sur Windows ; c'est ça que le `/goal` vérifie)

1. `pnpm typecheck` = 0 sur les 3 workspaces.
2. **Unit tests** :
   - orchestrateur : combos (lock BLE on/off, zone, distance GPS) → tier attendu, incluant l'hystérésis (pas de flap sur un drop bref) ;
   - geo : `haversineDistance` / `bearing` corrects sur cas connus ;
   - store / handling des messages WS (WS mocké) : chaque message serveur met le store à jour correctement.
3. **Test d'intégration Node** contre `wrangler dev` local : **deux clients WS** simulent deux téléphones →
   - create → join → les deux streament du GPS → chacun reçoit le `peerGps` de l'autre ;
   - injection de signaux de proximité montants → le tier passe `active_gps → active_ble → social_handoff`, reporté au DO, pis l'autre reçoit `peerTier` ;
   - asserte la convergence des deux bords.

> Tout est mockable/automatisable sans appareil — 2.3 est un milestone **100 % gratuit**. Aucun Tier C ici (le vrai radio est remplacé par l'injection).

---

## Gotchas

- Le `bleUuid` : **seulement** depuis le message WS `session`. Si tu le vois fetché ailleurs, c'est un bug de sécurité.
- Reconnexion : au retour, le DO renvoie `session` (donc `bleUuid` + état) — relance `startProximity` proprement, sans doubler les listeners.
- Sur web, `startProximity` no-ope : c'est voulu, l'injection de signaux prend le relais pour les tests.
- `bearing`/`haversine` : garde-les purs et exportés (testables).
- ponytail : le minimum qui marche, pas d'abstraction spéculative.