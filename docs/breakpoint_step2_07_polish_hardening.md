# Prompt-plan Claude Code — BreakPoint · Étape 2.7 · Polish & durcissement

> Rends l'app existante **solide** — résilience, sécurité, accessibilité, états de chargement. **Aucune nouvelle feature.** Communication française, **code en anglais**. Web-testable gratis.

---

## Objectif & scope

Durcir ce qui existe déjà (jusqu'à 2.6) pour que rien ne plante, ne hang, ni ne fuie. **Pas** de nouvelle feature, **pas** de comptes/BD, **pas** de changement au cœur BLE ni à la machine à états du DO.

---

## 1. Résilience aux erreurs (le plus important)

Audite et durcis **tous les chemins d'échec** pour que chacun ait un état clair, jamais un hang ou un crash :
- **Backend injoignable** sur `createSession`/`joinSession` → état d'erreur + bouton réessayer, pas un spinner infini.
- **WS qui drop / reconnexions épuisées** → état clair (« connexion perdue, réessaie »), pas un écran figé.
- **Code de join invalide / expiré / session pleine** → message clair côté UI (mappe les 403/404/409 du backend).
- **GPS indisponible / refusé** → dégrade proprement (le BLE reste utile en close range) ; ne bloque pas le repérage.
- **Permission Bluetooth ou localisation refusée** → écran qui explique *pourquoi* + bouton « ouvrir les réglages » / réessayer. Le repérage a besoin du BLE : sans permission, dis-le clairement plutôt que d'échouer en silence.

## 2. États de chargement / pending

- Pendant `createSession`/`joinSession` en vol → état de chargement, bouton désactivé, pas de double-soumission.
- Tout appel réseau a un état pending visible.

## 3. Hygiène de sécurité — le `cap` dans l'URL

Le `joinCapability` ne doit **jamais** apparaître dans une partie de l'URL qu'un serveur loggerait (query string / path → logs d'accès, header Referer).
- Mets la capability dans le **fragment** de l'URL (`…#cap=…`) — les fragments ne sont pas envoyés aux serveurs ni dans le Referer — **ou** garde-la uniquement dans un deep link à schéma custom.
- Le parseur de join (écran Rejoindre + handler de deep link) lit la capability depuis le fragment ; la capability part ensuite dans le **body** du POST `/join` (déjà le cas), jamais dans une URL.
- Garde la modif backend minimale (juste la construction du `joinUrl`).

## 4. Accessibilité

- **La proximité ne doit JAMAIS être communiquée par la couleur seule** (le chaud/froid). Pair la couleur avec un signal non-couleur : le texte de distance, le label « tu chauffes/refroidis », la taille du radar. (Critique : c'est l'info centrale de l'app, pis le color-only exclut les daltoniens.)
- **Labels lecteur d'écran** sur l'écran de repérage : décris la direction/distance/état (« vers Othmane, environ 25 m, tu te rapproches ») et sur les contrôles principaux.
- **Reduced-motion** : le pulse du radar et l'animation du dégradé respectent `prefers-reduced-motion`.
- Cibles tactiles ≥ 44px ; supporte le dynamic type / scaling de police sans casser la mise en page.

## 5. Validation & états vides

- Code de join : valide format/longueur, feedback clair sur saisie invalide.
- Nom : non vide, longueur plafonnée.
- États vides (historique/contacts) : copy soignée, déjà en place — vérifie la cohérence.

---

## Hors scope
- Nouvelles features, comptes/BD, changements au cœur BLE / DO / protocole, quoi qui dépend d'un appareil.

---

## Critères de réussite — Tier A (gratuit sur web)

1. `pnpm typecheck` = 0.
2. **Tests des chemins d'échec** (mocks) : backend injoignable sur create/join → état d'erreur + retry ; WS épuisé → état clair ; 403/404/409 de join → message correct ; permission refusée → écran d'explication/réglages. Aucun hang.
3. **Test sécurité** : le `joinUrl` ne contient la capability **que dans le fragment** (assert le format) ; le parseur la lit du fragment et `/join` marche toujours.
4. **Tests accessibilité** : l'écran de repérage expose un signal de proximité **non-couleur** (texte/label) à chaque tier + des labels lecteur d'écran ; assert que l'état de proximité est lisible sans la couleur.
5. **États de chargement** présents et testés sur create/join.
6. `npx expo start --web` boot, le flow complet marche toujours.

> Le rendu visuel final + le lecteur d'écran réel sur appareil restent un check manuel léger (Tier C). Le `/goal` vérifie la structure web.

---

## Gotchas
- Modif backend = uniquement la construction du `joinUrl`. Ne touche pas au protocole, à la machine à états, à la proximité.
- ponytail : durcis, n'ajoute pas. Pas de lib de gestion d'erreur si quelques états suffisent. Le minimum qui rend solide.