# Prompt-plan Claude Code — BreakPoint · Étape 2.0 · Scaffold du monorepo

> Pose le squelette complet du monorepo BreakPoint. **Aucune logique métier ici** — juste la structure, le wiring entre workspaces, pis des « hello world » qui prouvent que chaque app démarre. Communication française, **tout le code en anglais**.

---

## Objectif

Un monorepo **pnpm + Turborepo** avec 3 workspaces qui compilent, s'importent entre eux, pis démarrent — prêt à recevoir les prochains prompt-plans.

## Décisions verrouillées (ne pas redébattre)

- React Native via **Expo (dev build / prebuild)** — jamais Expo Go.
- Module BLE = **module Expo local** dans `apps/mobile/modules/breakpoint-ble`.
- Protocole partagé en **TypeScript + Zod** dans `packages/protocol`.
- Backend = **Cloudflare Worker + Durable Object**, Hono, storage interne du DO.

## Structure à créer

```
breakpoint/
├── apps/
│   ├── mobile/                    Expo (TS, Expo Router)
│   │   └── modules/breakpoint-ble/  module Expo local (Swift + Kotlin)
│   └── backend/                   Worker + Durable Object
├── packages/
│   └── protocol/                  @breakpoint/protocol (TS + Zod)
├── docs/
│   └── plan.md                    doc vivant d'avancement (je te le fournis)
├── .claude/
│   └── skills/                    skills Claude Code (ponytail + design UI)
├── scripts/
│   └── convert-hyperagent-skill.mjs
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── package.json
```

## Détail par workspace

### Racine
- `pnpm-workspace.yaml` (`apps/*`, `packages/*`).
- `turbo.json` : pipelines `dev`, `build`, `typecheck`, `lint`.
- `package.json` racine (scripts qui délèguent à turbo), `tsconfig.base.json`, `.gitignore`, `.nvmrc` (Node LTS).
- `docs/plan.md` : place le fichier que je te donne, pis **coche sa case à la fin de l'étape**.

### packages/protocol (`@breakpoint/protocol`)
- TypeScript + Zod. Exporte des **versions initiales** (à enrichir aux étapes suivantes) :
  - `SessionState` (union de strings), `Tier` (`"far" | "close" | "very_close" | "social"`).
  - schémas Zod placeholders des messages WS client→serveur et serveur→client, alignés sur le protocole déjà défini.
  - `formatBleUuid(bytes: Uint8Array): string` (stub).
- Build via tsc ou tsup, exporte types **et** runtime.

### apps/backend (`@breakpoint/backend`)
- Worker + Hono. Route `GET /health` → `{ ok: true }`.
- Classe `SessionDO` **stub** : binding câblé dans `wrangler.toml` (section `[[migrations]]` incluse), avec une méthode triviale appelable (ex. `GET /sessions/ping` qui touche le DO et renvoie son id). **Aucune machine à états ici.**
- Dépend de `@breakpoint/protocol`.
- Cible : `wrangler dev` sert `/health`.

### apps/mobile (`@breakpoint/mobile`)
- App Expo (TS, Expo Router). Un écran placeholder qui importe un type de `@breakpoint/protocol` pour prouver la résolution.
- Dépendances : `expo-location`, `zustand`. (Pas encore `react-native-ble-plx` — on l'ajoute à l'étape 2.2.)
- **Module Expo local** créé via `npx create-expo-module --local breakpoint-ble` : expose une méthode no-op `hello(): string` appelable depuis JS. Squelette Swift (iOS) + Kotlin (Android) qui build et ne fait rien d'autre.
- **Config Metro monorepo** : `watchFolders` vers la racine + `nodeModulesPaths`, en suivant le guide monorepo officiel d'Expo.
- `app.config.ts` avec les plugins de permissions **Bluetooth + localisation déclarés** (mais pas encore demandés au runtime).

## Skills à installer (Claude Code)

Mets les deux sources de skills dans `.claude/skills/` du repo, pour que Claude Code les ait sous la main pendant tout le build.

### 1. ponytail — discipline de code (YAGNI, minimal)
Repo : `https://github.com/DietrichGebert/ponytail`
- Clone-le dans un dossier temporaire, copie ses dossiers `skills/*` (`ponytail`, `ponytail-audit`, `ponytail-debt`, `ponytail-gain`, `ponytail-help`, `ponytail-review`) vers `.claude/skills/`.
- Chaque dossier a déjà un `SKILL.md` au bon format (frontmatter `name`/`description`). **Rien à convertir.**
- Les `hooks/*` (statusline, mode-tracker) sont **optionnels** — ne les installe PAS par défaut (ils exécutent du JS). On les ajoutera seulement si on veut le statusline. Licence MIT.

### 2. hyperagent-public-skills — design / UI (à convertir)
Repo : `https://github.com/alexmcdonnell-airtable/hyperagent-public-skills`
- ⚠️ Ce sont des **exports JSON** (format Airtable HyperAgent), **pas** des `SKILL.md`. Conversion obligatoire.
- Chaque `skill-*.json` a un champ `data` contenant : `name`, `description`, `whenToUse`, `skillMdBody` (le corps markdown), et `scripts` (tableau de `{ filename, content }`).
- Écris un script réutilisable `scripts/convert-hyperagent-skill.mjs` qui, pour un JSON donné : crée `.claude/skills/<slug>/SKILL.md` avec un frontmatter (`name` + `description` = `description` ou à défaut `whenToUse`) suivi de `skillMdBody`, pis écrit chaque entrée de `scripts` comme fichier dans le même dossier.
- **Ne convertis que le sous-ensemble UI** (discipline de scope — on saute claymation, trailers, landscaping, etc.) :
  - `skill-vignelli-canon-design-system`
  - `skill-muller-brockmann-grid-systems`
  - `skill-brand-book-generator`
  - (optionnel) `skill-nyt-data-viz`
- Le même script doit pouvoir en convertir d'autres plus tard si on en veut.

## Hors scope (ne PAS faire)

- Machine à états du DO, endpoints create/join réels, relai WebSocket → étape 2.1.
- Logique BLE advertise/scan/RSSI → étape 2.2.
- Les écrans → Claude Design.

## Critères de réussite

1. `pnpm install` propre, zéro erreur de résolution de workspace.
2. `pnpm typecheck` passe sur les 3 workspaces.
3. backend : `wrangler dev` → `GET /health` = `{ ok: true }`, pis le `SessionDO` stub répond.
4. mobile : `expo prebuild` réussit, Metro bundle, l'import de `@breakpoint/protocol` résout, pis `hello()` du module `breakpoint-ble` est appelable dans un dev build.
5. `docs/plan.md` présent, case « 2.0 » cochée.
6. Skills en place dans `.claude/skills/` : `ponytail` copié tel quel (activable), pis les skills UI convertis depuis hyperagent (vignelli, müller-brockmann, brand-book) au format `SKILL.md`.

## Gotchas à anticiper

- **Metro + symlinks pnpm = LE point de friction.** Sans `watchFolders` + `nodeModulesPaths` bien configurés, Metro ne trouvera pas `@breakpoint/protocol`. À régler en premier si le bundle échoue.
- `wrangler.toml` : ne pas oublier la section `[[migrations]]` pour la classe du DO.
- Le module Expo doit être créé en `--local` pour vivre dans l'app sans publish npm.