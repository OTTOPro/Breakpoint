# Prompt-plan Claude Code — BreakPoint · Étape 2.8 · Écran de diagnostic de proximité

> Instrumente le pipeline de proximité : un écran qui montre en **live** le RSSI brut/lissé, la zone, la tendance, le lock et le tier — avec des **contrôles de tuning** qui ajustent la config en direct. But : rendre le tuning Tier C (sur appareils) **data-driven** au lieu de deviner. Web-testable gratis (signaux injectés). Communication française, **code en anglais**.

---

## Objectif & scope

Quand tu testeras sur tes deux iPhones, calibrer les seuils à l'aveugle serait pénible. Cet écran te laisse **voir le vrai signal** et **ajuster les constantes en direct** jusqu'à ce que le warmer/colder se sente bien — puis tu lis les valeurs finales pour les baker.

**Hors scope :** le vrai radio BLE (no-op/injecté sur web), toute nouvelle feature produit, le tuning lui-même (ça, c'est Tier C sur appareils).

---

## 1. Extraire les constantes tunables → `proximityConfig`

Aujourd'hui les seuils/constantes sont probablement inline dans le smoothing/orchestrateur (2.2/2.3). Sors-les dans un **`proximityConfig`** (avec valeurs par défaut **identiques aux actuelles** — ne change aucun comportement) que le pipeline lit :
- seuils RSSI → zone (far/close/very_close/social) ;
- smoothing : alpha (EMA) / taille de fenêtre ;
- lock gating : N échantillons / fenêtre T ;
- durée de grâce (hystérésis avant rétrogradation).

Le `proximityConfig` est **mutable en runtime** (un petit store) pour que l'écran de diagnostic l'ajuste.

## 2. L'écran `/diagnostics`

Accessible depuis **Profil** (un lien « Diagnostics » en bas ; peut être gaté à `__DEV__` plus tard). Lit le **même `ProximityPipeline`** que l'app (source injectable sur web, signaux réels sur appareil) — **aucune logique parallèle**.

Il affiche en live :
- **Readout numérique** : RSSI brut, RSSI lissé, zone, tendance (warming/cooling), lock (oui/non + nb d'échantillons dans la fenêtre), tier courant.
- **Sparkline** : RSSI brut + lissé superposés sur les ~N dernières secondes (tu *vois* le bruit pis l'effet du lissage). Un simple SVG suffit — **pas de lib de charting** (ponytail).
- **Valeurs de config courantes** affichées.
- **Contrôles de tuning** : des sliders pour chaque valeur du `proximityConfig`, appliqués **en direct** au pipeline (baisser un seuil change la zone pour le même RSSI, instantanément).
- **Contrôle d'injection** (pour le test web) : pousser des RSSI manuels / un flux synthétique play-pause, pour démontrer l'écran sans radio.

---

## Critères de réussite — Tier A (gratuit sur web)

1. `pnpm typecheck` = 0 sur les 3 workspaces.
2. La route `/diagnostics` rend, atteignable depuis Profil ; en injectant des RSSI synthétiques, **les readouts (brut/lissé/zone/tendance/lock/tier) se mettent à jour** et la **sparkline se dessine**.
3. Ajuster un contrôle de tuning **change la sortie du pipeline** pour le même signal (ex. baisser un seuil de zone → la zone change), prouvé par test.
4. **Tests** : le diagnostic reflète l'état du pipeline pour des signaux injectés ; une modif de `proximityConfig` se propage à la sortie de `computeProximity`/l'orchestrateur ; les défauts du config **n'ont rien changé** au comportement existant (les tests 2.2/2.3 restent verts).
5. `npx expo start --web` boot, `/diagnostics` atteignable.

---

## Gotchas

- L'extraction du config **ne doit changer aucun défaut** — mêmes nombres qu'avant, les tests existants restent verts.
- Le diagnostic lit **le même pipeline** que l'app — surtout pas une copie de la logique de proximité.
- Sparkline = SVG maison simple, pas de dépendance de charting (ponytail).
- ponytail : c'est un outil de dev, garde-le minimal — readout + sparkline + sliders + injection, rien de plus.