# Prompt-plan Claude Code — BreakPoint · Étape 2.9 · History enrichi & fiable

> Rends l'historique solide : il enregistre **chaque** rencontre de façon fiable, avec des **détails riches** (nom, heure, durée, issue), et il s'affiche proprement. **Pas de re-invite** (ça demande des comptes = V2). Reste **local** (AsyncStorage). Communication française, **code en anglais**. Web-testable gratis.

---

## Objectif & scope

L'historique existe depuis 2.5 (hook moteur minimal → entrée locale). On le rend **fiable** (aucun chemin terminal manqué) et **riche** (vraies infos affichées).

**Hors scope :** re-inviter depuis l'historique (V2/comptes), persistance backend (reste local), map, push.

---

## Ce qu'on bâtit

### 1. Schéma d'entrée enrichi
Une entrée d'historique capture : `{ id, peerLabel, startedAt, endedAt, durationMs, outcome }`.
- `peerLabel` : le label du pair **si la session l'expose** ; sinon un fallback neutre (« Someone ») — **n'invente rien**.
- `outcome` : mappé depuis l'**état terminal réel** de la session → catégories `met` (rencontre réussie), `abandoned` (l'autre a quitté), `expired` (TTL), `lost`/`failed` (connexion perdue). Utilise les vrais noms d'états de la machine du DO.
- `startedAt` : si le temps de début n'est pas déjà suivi, capture-le quand la session devient **active** ; `durationMs = endedAt − startedAt`.

### 2. Enregistrement fiable
Le hook moteur enregistre une entrée enrichie sur **CHAQUE** transition terminale (met + toutes les variantes d'ended), pas seulement certaines. Vérifie qu'aucun chemin terminal n'est oublié.

### 3. Affichage riche (`/history`)
Lignes riches : **nom du pair**, **temps relatif** (« 2h ago » / date), **durée** (« 12 min »), **badge d'issue** (met/abandoned/expired/lost). Tri **newest-first**. Garde l'**état vide** existant. Suis le design system (skills design installés dans le repo).

### 4. Robustesse
Les entrées **legacy/partielles** (anciennes, champs manquants) ne crashent pas le rendu riche — dégrade proprement.

---

## Critères de réussite — Tier A (gratuit sur web)

1. `pnpm typecheck` = 0.
2. **Tests** :
   - le hook moteur enregistre une entrée enrichie (peerLabel, startedAt, endedAt, durationMs, outcome) sur **chaque état terminal** (met/abandoned/expired/lost) avec les bonnes valeurs ;
   - `/history` rend des lignes riches (nom, temps relatif, durée, badge d'issue), **newest-first**, + état vide ;
   - entrées legacy/partielles gérées **sans crash**.
   - Les tests d'historique de 2.5 restent verts (étends-les vers la forme riche, ne les casse pas).
3. `npx expo start --web` : `/history` montre des entrées seedées riches ; après une **fin de session simulée**, une nouvelle entrée correcte apparaît.

---

## Gotchas

- La **durée** a besoin d'un `startedAt` — capture le temps actif si pas déjà fait.
- `peerLabel` : utilise-le seulement si la session l'expose, sinon fallback neutre.
- ponytail : **enrichis** le store/écran existants, ne les rebâtis pas. Local seulement, aucun backend.