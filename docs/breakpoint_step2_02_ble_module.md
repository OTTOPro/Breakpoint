# Prompt-plan Claude Code — BreakPoint · Étape 2.2 · Module BLE natif `breakpoint-ble`

> Écris le **vrai** module de proximité : advertise + scan connectionless de l'UUID de session, iOS (Swift) + Android (Kotlin) via Expo Modules API, plus la couche JS de smoothing. Communication française, **tout le code en anglais**.

---

## Objectif & scope

Le module `apps/mobile/modules/breakpoint-ble` passe de no-op à fonctionnel : les deux téléphones **advertisent ET scannent le même UUID 128-bit de session**, le natif émet du **RSSI brut** vers JS, pis une couche JS le transforme en **zone + tendance**.

**Hors scope (pas ici) :** la décision de tier combinée avec le GPS, le store de session, le client WebSocket → étape 2.3. La machine à états du DO → déjà fait (2.1).

---

## Décisions verrouillées (rappel — ne pas redébattre)

- **Connectionless** : advertise + scan, **pas** de connexion GATT.
- Les deux advertisent/scannent **le même UUID de session** (en 2 personnes, le seul pair capté = l'autre).
- **Service UUID only** dans le paquet (contrainte iOS : pas de service/manufacturer data custom).
- Le natif émet **`{ rssi, timestamp }` brut** ; tout le smoothing/zone/tendance est en **JS** (tunable sans recompiler le natif).
- Android : **foreground service** pour un scan fiable + permissions runtime.

---

## API JS exposée par le module

```ts
startProximity(sessionUuid: string): void   // advertise(sessionUuid) + scan filtré sur le service UUID app
stopProximity(): void                        // arrête advertise + scan
// event:
onPeerSignal: (e: { rssi: number; at: number }) => void
```
Le natif filtre déjà sur l'UUID app + l'UUID de session ; il remonte juste le RSSI brut de chaque détection du pair.

---

## iOS (Swift, CoreBluetooth)

- `CBPeripheralManager.startAdvertising` avec `CBAdvertisementDataServiceUUIDsKey = [sessionUuid]`.
- `CBCentralManager.scanForPeripherals(withServices: [sessionUuid])` → `didDiscover` → émet `{ rssi: RSSI, at }`.
- Gérer `centralManagerDidUpdateState` / `peripheralManagerDidUpdateState` (poweredOn, unauthorized).

## Android (Kotlin)

- `BluetoothLeAdvertiser.startAdvertising` avec `AdvertiseData` contenant le service UUID.
- `BluetoothLeScanner.startScan` avec un `ScanFilter` sur le service UUID → `onScanResult` → émet `{ rssi: result.rssi, at }`.
- **Foreground service** pour le scan fiable écran éteint ; permissions runtime `BLUETOOTH_ADVERTISE` + `BLUETOOTH_SCAN` (`neverForLocation` sur 12+), fallback localisation < 12.

## Couche JS (`apps/mobile/src/proximity/`)

- Wrapper qui consomme `onPeerSignal`.
- **Smoothing** : lissage exponentiel (ou moyenne mobile) sur fenêtre ~1–2 s → `rssiSmoothed`.
- **Mapping** : `rssiSmoothed` → zone (`far` / `close` / `very_close` / `social`) + **tendance** (`warming` / `cooling`) basée sur la dérivée du signal lissé.
- La fonction de mapping doit être **pure et exportée** : `(échantillons bruts) → { zone, trend }`, pour être unit-testable sans appareil.

## Permissions

- `app.config` : les plugins BLE + localisation (déclarés en 2.0) → demandés au runtime **au bon moment** (juste avant `startProximity`), avec un texte d'explication clair.

---

## Critères de réussite

### Tier A — gratuit, prouvable sur Windows (c'est ça que le `/goal` vérifie)
1. `pnpm typecheck` vert sur les 3 workspaces.
2. **Unit tests du smoothing** (Vitest/Jest) : nourris des flux de RSSI synthétiques et assert →
   - signal qui monte → zone qui se resserre + `trend = warming` ;
   - signal qui baisse → zone qui s'élargit + `trend = cooling` ;
   - bruit ponctuel absorbé par le lissage (pas de saut de zone sur un seul outlier).
3. L'API `startProximity` / `stopProximity` / `onPeerSignal` existe et est typée ; le **stub web no-op** est propre, donc `npx expo start --web` **boot sans crash**.

### Tier B — gratuit mais demande le SDK Android (manuel, optionnel maintenant)
4. Le module Android compile : `cd apps/mobile/android && ./gradlew assembleDebug` réussit.

### Tier C — différé, sur appareils (TON test manuel, plus tard avec EAS)
5. `eas build -p ios --profile development` → installer sur les 2 iPhones → lancer une session → **vérifier que le `rssiSmoothed` monte en se rapprochant et descend en s'éloignant**, et que la zone/tendance suit. *C'est le seul vrai test du BLE radio ; aucun script ne le remplace.*

> Le `/goal` cible **Tier A uniquement**. Marque clairement les critères 4 et 5 comme manuels/différés dans le résumé final, sans les traiter comme bloquants.

---

## Gotchas à anticiper

- Le `sessionUuid` est un **UUID 128-bit** ; côté natif, le passer en `CBUUID(string:)` / `ParcelUuid.fromString` directement.
- iOS : pas de scan « wildcard » fiable en arrière-plan — scanne avec l'UUID explicite (qu'on connaît), ça marche foreground ET background iOS↔iOS.
- Android 12+ : sans `neverForLocation` sur `BLUETOOTH_SCAN`, tu te ramasses à redemander la localisation pour rien.
- Garde le natif **bête** : il advertise, il scanne, il remonte le RSSI brut. Aucune logique de zone/tendance côté natif (ça vit en JS, testable).
- Respecte ponytail : pas d'abstraction spéculative dans le module, le minimum qui marche.