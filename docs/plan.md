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
- [ ] 2.3 — Câblage app (GPS `expo-location`, store de session, client WS, smoothing + tiers)
- [ ] 2.4 — Écrans branchés sur le vrai backend

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