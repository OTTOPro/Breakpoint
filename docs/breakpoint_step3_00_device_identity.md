# Prompt-plan Claude Code — BreakPoint · V2 Phase 1 · Identité d'appareil + D1 (3.0)

> Pose la fondation V2 : un **device ID anonyme stable** + **D1** + un endpoint de **registration**. **Aucune auth, aucun email, aucune PII.** C'est de la plomberie — la base des contacts (Phase 2) et du push (Phase 3). Additif : ne touche **pas** le DO/session/proximité de V1. Communication française, **code en anglais**. Web-testable gratis.

---

## Modèle d'identité (Niveau 1)

- **`deviceId`** : UUID v4 généré au 1ᵉʳ lancement, **public** — c'est le handle de contact (partageable). Stocké en AsyncStorage.
- **`deviceSecret`** : token aléatoire émis par le serveur à la 1ʳᵉ registration, **privé** — prouve la propriété du deviceId pour toute mutation. Stocké via **expo-secure-store** (fallback web). Le serveur n'en garde qu'un **hash**.
- Trade-off assumé : pas de récupération/multi-appareil (c'est le Niveau 2, plus tard). `deviceId` agit comme bearer → le `deviceSecret` empêche l'usurpation triviale.

---

## Ce qu'on bâtit

### Backend (D1 + Worker, additif)
1. **D1** : binding dans `wrangler.toml` (`[[d1_databases]]`) + dossier de migrations.
2. **Schéma `devices`** : `deviceId TEXT PRIMARY KEY`, `displayName TEXT`, `secretHash TEXT`, `pushToken TEXT NULL`, `createdAt`, `lastSeenAt`.
3. **Endpoints** (Hono, lisent `c.env.DB`) :
   - `POST /devices/register` — body `{ deviceId, displayName }`. 1ᵉʳ appel → crée la ligne, **émet un deviceSecret** (retourné une seule fois), stocke `secretHash`. Met à jour `lastSeenAt`.
   - `POST /devices/update` — body `{ deviceId, deviceSecret, displayName }` → vérifie le hash, met à jour `displayName`. **Rejette** si secret absent/mauvais.

### Client (mobile, additif)
4. Module `identity` : au 1ᵉʳ lancement, génère `deviceId` (UUID crypto), appelle `register`, stocke `deviceId` (AsyncStorage) + `deviceSecret` (SecureStore). Aux lancements suivants : assure la registration (upsert `lastSeenAt`).
5. **Sync du nom** : quand le `displayName` du profil change, appelle `/devices/update`. Une seule source de nom (le profileStore existant).

---

## Hors scope
- Graphe de contacts + échange de deviceId en session (Phase 2), livraison push (Phase 3), auth/email (jamais en Niveau 1), le **DO/session/proximité** (intacts).

---

## Critères de réussite — Tier A (gratuit sur web)

1. `pnpm typecheck` = 0.
2. **Backend (tests + D1 local)** : la migration s'applique ; `register` crée un device + émet un secret ; `update` avec le bon secret change le `displayName` ; `update` sans/avec mauvais secret est **rejeté** ; le secret n'est stocké que **hashé**.
3. **Client (tests)** : 1ᵉʳ lancement → `deviceId` + `deviceSecret` générés et persistés + registration appelée ; renommer le profil déclenche `/devices/update`.
4. `wrangler dev` (D1 local) + `npx expo start --web` : au 1ᵉʳ load un device est enregistré ; la ligne D1 existe (`wrangler d1 execute … "SELECT * FROM devices"`).

---

## Gotchas
- **D1 local vs déployé** : applique les migrations sur les deux (`wrangler d1 migrations apply --local` ET remote).
- **UUID** : crypto-fort (`expo-crypto` / `crypto.randomUUID`), pas de Math.random.
- **SecureStore** : natif avec fallback web — le `deviceSecret` y va, pas en AsyncStorage.
- Additif : aucune régression V1 (les ~107 tests existants restent verts ; le DO/proximité ne bougent pas).
- ponytail : la plus petite fondation qui débloque la Phase 2, rien de spéculatif.