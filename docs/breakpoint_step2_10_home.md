# Prompt-plan Claude Code — BreakPoint · Étape 2.10 · Home dynamique

> Enlève le statique du home et rends-le **dynamique, interactif et attirant**, avec les fonctionnalités réellement disponibles. **La map est reportée à la phase device** (native). Communication française, **code en anglais**. Web-testable gratis.

---

## Objectif & scope

Le home actuel (importé en 2.4) est designé mais statique. On le branche sur les vraies données et on le rend premium.

**Hors scope :** la **map** (native → phase device), la notif-à-un-contact (V2/comptes), le QR (jamais). Ne les ajoute pas.

---

## Ce qu'on bâtit dans le home

1. **Greeting dynamique** — le nom depuis `profileStore` (« Hey Othmane »).
2. **Hero « Find someone »** — l'action principale (créer une session), proéminente et premium : accent du dégradé de proximité (chaud→froid), respecte `prefers-reduced-motion` (cohérent 2.7).
3. **Entrée « Have a code? » / Join** — secondaire, vers le join par **code 6 caractères**.
4. **Aperçu des rencontres récentes** — les **1–3 dernières** entrées depuis le `historyStore` enrichi (2.9), en lignes riches (nom · temps relatif · durée · badge), tap → `/history`. **Réutilise** le rendu de ligne de 2.9 (ne duplique pas la logique). État vide quand aucune rencontre.
5. **Enlève tout contenu statique/placeholder.**
6. **Branding + design system** : mark du logo, Instrument Sans, palette, accessible (labels lecteur d'écran, cibles ≥44px, reduced-motion). Appuie-toi sur les **skills design installés** dans le repo pour l'art direction.

> (Optionnel : si tu veux art-diriger le home dans Claude Design d'abord puis l'importer, c'est possible — mais le design system est déjà là, donc par défaut on l'implémente en code pour garder le momentum.)

---

## Critères de réussite — Tier A (gratuit sur web)

1. `pnpm typecheck` = 0.
2. **Tests** :
   - le home rend le **greeting dynamique** depuis `profileStore` ;
   - l'**aperçu récents** montre le top N (newest-first) depuis `historyStore` + **état vide** quand aucune entrée ;
   - les actions **routent** correctement : Find → flow de création/invite, Join → entrée code, aperçu/tap → `/history` ;
   - labels d'accessibilité + cibles ≥44px sur les actions.
3. `npx expo start --web` : le home montre le nom + les rencontres récentes (seedées), **aucun placeholder statique** ; Find/Join/récents routent tous.

---

## Gotchas

- **Réutilise** la ligne d'historique riche de 2.9 pour l'aperçu — pas de logique de rendu dupliquée (ponytail).
- **Pas de map** (reportée), pas de feature V2.
- Garde le comportement **navbar** (présente sur le home) intact.
- Reduced-motion respecté pour toute animation/accent.