# Prompt-plan Claude Code — BreakPoint · Étape 2.4 · Écrans branchés sur le moteur

> Importe le design depuis Claude Design et implémente les écrans en **React Native** (Expo Router), **branchés sur le moteur de session de 2.3** (store / orchestrateur / wsClient). Communication française, **code en anglais**. Testable gratis sur web.

---

## Pré-requis (à faire AVANT le run)

- Le connecteur MCP **`claude_design`** doit être connecté dans Claude Code. S'il demande l'autorisation, roule **`/design-login`** (ajoute les scopes `user:design:read/write`).

## Source du design

- Importe le projet via les outils MCP `claude_design` :
  `https://claude.ai/design/p/6aadf45e-e877-49c3-b228-bf80f142bea3?file=BreakPoint.dc.html`
- Implémente : **`BreakPoint.dc.html`**.

---

## Objectif & scope

Transformer le design en **vrais écrans RN bornés à l'état**, pas du visuel statique. Chaque écran lit le store Zustand (2.3) et re-render en live.

**Hors scope :** modifier le moteur (2.3) ou le backend (2.1) ; le vrai radio BLE (no-op/injecté sur web) ; le polish final sur appareil.

---

## ⚠️ Le piège à éviter

« Implémenter `BreakPoint.dc.html` » ne veut PAS dire embarquer du HTML ni produire des écrans figés. Ça veut dire : **recréer le design en composants RN, branchés sur le moteur existant**. N'invente aucun state — réutilise `store.ts`, `orchestrator.ts`, `wsClient.ts`, `api.ts`, `engine.ts` de 2.3.

---

## Écrans à implémenter (depuis le design)

- **Onboarding / permissions** — appelle `requestProximityPermissions()` + la permission `expo-location`, au bon moment, avec l'explication.
- **Accueil (lanceur)** — « Trouver quelqu'un » → `createSession()` → route vers Inviter ; Récents ; navbar pill en bas.
- **Inviter & attendre** — affiche `joinCode` + QR + lien depuis la réponse de `createSession` ; état d'attente piloté par le store (`peerJoined`).
- **Rejoindre** — saisie code / scan → `joinSession()` → entre dans la session.
- **Repérage (cœur)** — plein focus, **pas de navbar**. Lit `tier`, `proximity.zone`, `proximity.trend`, et `peerGps` (→ `bearing`/`haversineDistance`) du store, et re-render en live : flèche dominante au tier `far`, radar warmer/colder aux tiers proches, moment social à `social`. Le **dégradé de fond froid↔chaud est piloté par la valeur de proximité en temps réel** (continu, deux sens).
- **Écrans d'échec** — `peerLeft`/`abandoned`, `expired`, signal perdu (depuis l'état du store).
- **Historique / contacts** — légers.

## Le garde-fou du throughline (décision mise à jour)

- Le setup porte une teinte froide **très subtile** qui se réchauffe vers la rencontre — mais garde-le **calme et retenu**.
- **Réserve le saut de saturation à l'écran de repérage** : il doit rester visiblement plus intense que le reste, sinon l'escalade se perd. Si en implémentant le setup devient trop coloré, retiens-le.

## Fidélité

- Respecte la typo (Instrument Sans), la palette, la navbar pill, les coins arrondis du design importé.

---

## Critères de réussite — Tier A (gratuit sur web ; ce que le `/goal` vérifie)

1. `pnpm typecheck` = 0 sur les 3 workspaces.
2. `npx expo start --web` **boot**, et le **flow complet se navigue** : onboarding → accueil → inviter/rejoindre → repérage → moment social → écrans d'échec accessibles.
3. **Tests de rendu pilotés par l'état** (React Testing Library) : en poussant des `tier`/`zone`/`trend` dans le store via la **source de signaux injectable** de 2.3, l'écran de repérage rend le bon état (flèche au `far`, radar aux tiers proches, moment social à `social`) et le dégradé/accent change avec la proximité. Au moins un test par tier + la transition de refroidissement.

> **Vérif manuelle (gratuite, sur web, par toi)** : ouvre deux onglets, fais le flow create→join, injecte des signaux montants/descendants, pis confirme à l'œil que le repérage chauffe/refroidit pis que le setup reste plus calme que le repérage. La fidélité visuelle finale sur vrai téléphone reste un check Tier C.

---

## Gotchas

- Le `bleUuid` arrive du store (alimenté par le message WS `session` de 2.3) — l'écran ne le fetch jamais lui-même.
- Navbar **seulement** sur accueil/historique/contacts/profil ; repérage en plein focus.
- Le dégradé doit suivre la proximité **en continu** (pas 4 paliers figés) — réutilise `proximity.rssiSmoothed`/`zone`/`trend` du store.
- ponytail : composants minimaux, réutilise, pas d'abstraction spéculative.