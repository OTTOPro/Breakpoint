# Prompt-plan Claude Code — BreakPoint · Étape 2.6 · Onboarding (1ʳᵉ fois + nom)

> Fais en sorte que l'onboarding ne s'affiche **qu'au premier lancement**, et **capture le nom d'affichage** dedans. Local, web-testable gratis. Communication française, **code en anglais**.

---

## Objectif & scope

Deux petites features liées :
1. L'onboarding ne se montre qu'**une fois** (premier lancement) ; ensuite l'app va direct à `/home`.
2. Le **nom d'affichage** est saisi **dans l'onboarding** (pas seulement dans Profil), écrit dans le même `profileStore` que `getSessionLabel()`.

**Hors scope :** backend, DB, persistance distante. Tout est local (le storage + les stores existants de 2.5).

---

## Ce qu'on bâtit

- **Flag `onboardingComplete`** : persisté en local (réutilise `src/local/storage.ts` + un store Zustand existant ou un petit champ dans le profileStore). Mis à `true` à la fin de l'onboarding.
- **Étape « nom »** dans le flow d'onboarding : un écran/section qui écrit le nom dans le `profileStore` (la valeur lue par `getSessionLabel()`). Place-la avant ou après les permissions, comme le design le suggère.
- **Routing au boot** (`src/app/_layout` ou la route racine) :
  - hydrate les stores locaux ;
  - si `onboardingComplete` → redirige vers `/home` ;
  - sinon → `/onboarding`.
  - à la fin de l'onboarding (permissions + nom faits) → set `onboardingComplete = true` → va à `/home`.

---

## ⚠️ Gotcha critique : la course d'hydratation

Au lancement, **avant** que le store persisté soit hydraté, tu ne sais pas encore si l'onboarding est fait. Si tu décides la route trop tôt, un utilisateur déjà onboardé verra un **flash d'onboarding**. Donc :
- attends que l'hydratation soit finie (montre un splash / rien) **avant** de décider la redirection ;
- ne set jamais le flag pendant l'hydratation.

(Vous avez déjà corrigé une course d'hydratation en 2.5 — même vigilance ici.)

---

## Critères de réussite — Tier A (gratuit sur web)

1. `pnpm typecheck` = 0 sur les 3 workspaces.
2. `npx expo start --web` :
   - **storage vide (1ᵉʳ lancement)** → l'onboarding s'affiche, l'étape nom y est, et après complétion le nom est dans le profil + `getSessionLabel()` le retourne ;
   - **relance (flag présent)** → l'app va **direct à `/home`**, aucun onboarding, **aucun flash**.
3. **Tests RTL** :
   - le flag persisté/relu contrôle bien la redirection (onboarding vs home) ;
   - l'étape nom écrit dans le `profileStore` ;
   - pas de flash d'onboarding quand le flag est déjà set (l'attente d'hydratation est respectée).

---

## Gotchas

- Réutilise le storage + les stores de 2.5, n'en crée pas de nouveaux inutilement.
- Le nom posé en onboarding pis le nom édité dans Profil sont **la même valeur** (un seul champ).
- ponytail : minimal, pas d'écran superflu, pas d'abstraction spéculative.