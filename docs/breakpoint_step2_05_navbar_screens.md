# Prompt-plan Claude Code — BreakPoint · Étape 2.5 · Écrans légers de la navbar

> Bâtis les 3 onglets secondaires de la navbar (Historique, Contacts, Profil) et **câble proprement la navbar** (zéro lien mort). Léger, local, testable gratis sur web. Communication française, **code en anglais**.

---

## Objectif & scope

Compléter la navbar : aujourd'hui seuls `accueil` est réel, les autres onglets sont absents/morts. On les rend réels — mais **légers et locaux**, sans inventer d'architecture.

**Décision de scope (verrouillée) :** BreakPoint n'a **pas** d'identité de pair persistante ni d'adressage. Donc :
- **pas** de vrai « ré-inviter un contact » (ça suppose des comptes/adressage → V2) ;
- **pas** de persistance backend (le DO reste éphémère).
Tout ce qui suit est **local au téléphone** (AsyncStorage ou équivalent).

---

## Ce qu'on bâtit

### Profil (`/profile`)
- Éditer ton **nom d'affichage** (utilisé comme ton label quand tu crées/rejoins une session), persisté en local, relu au démarrage.
- État des permissions (Bluetooth + localisation) + lien pour les redemander.
- About / version (statique).

### Historique (`/history`)
- Liste **locale** des rencontres terminées : label du pair (si dispo), date/heure.
- Alimentée par un **hook minimal** dans le moteur (2.3) : à la transition `ended`/`met`, écrire une entrée locale. *Garde cette modif du moteur la plus petite possible — juste l'écriture locale, rien d'autre.*
- **État vide propre** quand il n'y a rien (« Tes rencontres apparaîtront ici »).

### Contacts (`/contacts`)
- Liste **locale de labels** de pairs sauvegardés (cohérente avec les « Récents » déjà sur l'accueil).
- **État vide propre**. Pas de re-invite réel — au mieux, tap = pré-remplir un label dans une nouvelle session (cosmétique). Marque clairement que l'adressage direct est V2.

### Navbar
- Câble les **4 onglets** (`accueil` / `historique` / `contacts` / `profil`) vers de vraies routes — **aucun lien mort**.
- La navbar apparaît sur ces 4 écrans de navigation **seulement** ; elle reste **absente du flow de session** (invite/join/finding/done/failure).
- Le nom d'affichage du Profil **alimente** `createSession`/`joinSession` comme label.

---

## Hors scope (ne PAS faire)

- Adressage de pairs / vrai re-invite direct (V2).
- Comptes utilisateur, persistance backend.
- Toucher au protocole WS, à la machine à états du DO, ou à la logique de proximité.

---

## Critères de réussite — Tier A (gratuit sur web)

1. `pnpm typecheck` = 0 sur les 3 workspaces.
2. `npx expo start --web` boot ; les **4 onglets de la navbar routent** (aucun crash, aucun lien mort) ; la navbar est **absente** du flow de session.
3. **Tests RTL** :
   - Profil : éditer le nom → persisté en local → relu après remount ; le nom alimente bien le label de session.
   - Historique : état vide rendu ; avec des entrées seedées, elles s'affichent.
   - Contacts : état vide rendu ; avec des labels locaux seedés, ils s'affichent.
4. Le hook d'historique : une transition `ended`/`met` simulée écrit une entrée locale (testé via le store/moteur, sans appareil).

---

## Gotchas

- Garde la modif du moteur (2.3) **minuscule** : juste l'écriture d'une entrée locale à `ended`/`met`. Ne touche à rien d'autre.
- Réutilise les tokens de design existants (`src/ui/`) + la `Navbar` déjà créée — ne refais pas le style.
- ponytail : pas d'abstraction spéculative, états vides simples, le minimum qui marche. Si Contacts te tente de bâtir de l'adressage, **arrête** — c'est hors scope.