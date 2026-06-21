# BreakPoint — Plan

> Doc vivant. **Claude Code : coche les cases au fur et à mesure** que les étapes se terminent. C'est la source de vérité de l'avancement du projet.

## Vision

App mobile **mono-tâche** qui résout *le dernier 100 mètres* d'une rencontre : deux personnes au même endroit qui n'arrivent pas à se trouver. Session **ponctuelle**, guidage par paliers **GPS → BLE → moment social**, jusqu'au point de contact exact. Pour tout le monde.

---

## Phase 1 — UI / Design (Claude Design)

- [x] Système visuel verrouillé (Instrument Sans, palette mono + accents de proximité, 6 principes)
- [x] Écran de repérage — 4 états (far → close → very close → you're here) + refroidissement
- [x] Flow home / création de session (accueil, inviter & attendre, rejoindre)
- [ ] UI complète générée dans Claude Design + ajustée — **copy en anglais**

## Phase 2 — Backend & build

- [x] **2.0 — Scaffold du monorepo** (pnpm + Turborepo, 3 workspaces, wiring) — *livré : monorepo pnpm+Turbo, `@breakpoint/protocol` (TS+Zod), backend Worker+`SessionDO` stub (`/health`), app Expo SDK 56 + module local `breakpoint-ble` (`hello()`), skills ponytail + UI hyperagent convertis*
- [x] 2.1 — Session Durable Object (machine à états, create/join, relai WS, TTL) — *livré : `SessionDO` (WebSocket Hibernation), routes `POST /sessions` + `/join` + `GET /ws`, relai GPS/tier, distribution du `bleUuid` uniquement par WS, alarmes joinTtl/maxLifetime/grace, reconnexion par `participantToken` ; test e2e 19/19 couvrant les 7 critères*
- [x] 2.2 — Module BLE natif (advertise/scan du `bleUuid`, RSSI brut → JS) — *Tier A livré : API typée `startProximity`/`stopProximity`/`onPeerSignal`, smoothing JS pur (EMA → zone + tendance) avec unit tests Vitest 6/6, stub web no-op (`expo start --web` boot OK), code natif iOS (Swift CoreBluetooth) + Android (Kotlin + foreground service) écrit. **Tier B (compil. Android `./gradlew assembleDebug`) et Tier C (test 2 appareils via EAS) = manuels/différés.***
- [x] 2.3 — Câblage app (GPS `expo-location`, store de session, client WS, smoothing + tiers) — *livré : `session/api` (create/join), `wsClient` (reconnexion), store Zustand, `location/geo` (haversine/bearing purs) + `gps` (expo-location), `orchestrator` (lock BLE + hystérésis), `proximityPipeline` injectable, `engine` glue. 30 unit tests verts + test d'intégration Node 2-clients contre `wrangler dev` (gps relay, montée tier active_gps→active_ble→social_handoff, peerTier, convergence ; bleUuid uniquement via WS `session`).*
- [x] 2.4 — Écrans branchés sur le vrai backend — *Tier A livré : design `BreakPoint.dc.html` (importé via MCP claude_design) recréé en composants RN (Expo Router) bornés au store de 2.3 — onboarding/permissions, accueil, inviter & attendre, rejoindre, **repérage** (flèche/radar/social + dégradé froid↔chaud continu piloté par `proximity`), social, écrans d'échec. `bleUuid` lu du store (jamais fetché par un écran), setup calme vs repérage saturé. Preuves : `pnpm typecheck`=0, `expo start --web` boot + 9 routes du flow en 200, 37 tests dont 7 RTL pilotés par l'état (un par tier + warming + cooling + throughline).*
- [x] 2.5 — Écrans légers de la navbar (Historique / Contacts / Profil) — *Tier A livré : persistance **locale** (AsyncStorage) — Profil (nom d'affichage persisté → alimente le label de session), Historique (liste locale + état vide ; écrit par un **hook moteur minuscule** sur `ended`/`met`), Contacts (stub local de labels, **aucun adressage de pair** — V2). Navbar câblée aux 4 onglets (zéro lien mort), **absente du flow de session**. Preuves : `pnpm typecheck`=0, `expo start --web` (4 onglets en 200 + navbar absente de invite/join/finding/done/failure), 45 tests dont RTL Profil (édit→persist→remount→label), Historique/Contacts (vide + seedé), et hook `ended`/`met`.*
- [x] 2.6 — Onboarding 1ʳᵉ fois + nom — *Tier A livré : flag `onboardingComplete` persisté dans le `profileStore` (2.5), `BootGate` anti-flash (splash jusqu'à hydratation puis redirige `/home` vs `/onboarding`), étape nom (`/name`) qui écrit dans le même champ que `getSessionLabel()`. Preuves : `pnpm typecheck`=0 ; **navigateur réel** — vide→`/onboarding`, nom saisi→`/home` (name+flag persistés), relance→direct `/home` sans flash (`saw_onboarding=false`) ; 49 tests dont RTL BootGate (flag contrôle la route + attente d'hydratation respectée) et étape nom (écrit le profileStore).*

---

## Architecture (référence)

**Monorepo** pnpm + Turborepo :
- `apps/mobile` — React Native via Expo (dev build). Expo Router, Zustand, expo-location, client WebSocket. Contient le module BLE natif local.
- `apps/mobile/modules/breakpoint-ble` — module Expo natif (Swift CoreBluetooth + Kotlin BLE). Émet du RSSI brut vers JS.
- `apps/backend` — Cloudflare Worker + Durable Object, Hono, WebSocket Hibernation, DO Alarms. Storage interne du DO.
- `packages/protocol` — `@breakpoint/protocol`, TS + Zod, source unique des types/messages.

**Deux plans de communication :**
- **Control plane** — mobile ↔ backend : HTTPS (`create`/`join`) + WebSocket (relai GPS/tier, livraison du `bleUuid`).
- **Data plane** — téléphone ↔ téléphone : BLE direct P2P (pas de serveur). Marche sans internet une fois proche.

---

## Décisions verrouillées

- RN via **Expo** (dev builds, jamais Expo Go).
- Monorepo **pnpm + Turborepo**.
- Protocole partagé `@breakpoint/protocol` (TS + Zod) = source unique de vérité.
- `bleUuid` dérivé du `sessionToken`, livré **uniquement** par WebSocket — jamais dans le lien de partage.
- Les transitions de tier (GPS→BLE→social) sont **pilotées par les capteurs du téléphone**, pas par le serveur. Le DO ne calcule aucune proximité.
- BLE : **connectionless** (advertise + scan, pas de connexion GATT). Les deux advertisent/scannent le même UUID de session.
- Couleur = **proximité seulement** (écrans de setup en noir et blanc).
- Pas de clone Google Maps · pas de fausse précision (le chiffre disparaît au tier « very close »).
- Max **2 participants** (V1).
- Skills Claude Code dans `.claude/skills/` : **ponytail** (discipline de code) + design UI convertis depuis hyperagent (**vignelli**, **müller-brockmann**, **brand-book**).

## Conventions

- Communication projet : **français**. Code & copy UI : **anglais**.
- Dev itératif : prompt-plans exécutés dans Claude Code, un morceau à la fois.
- À la fin de chaque étape : cocher la case ici + résumer en une ligne ce qui a été livré.