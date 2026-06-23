-- Anonymous device identity (V2 Phase 1). No auth, no email, no PII.
-- deviceId: public contact handle. secretHash: SHA-256 of the (server-issued)
-- deviceSecret — the secret itself is never stored.
CREATE TABLE IF NOT EXISTS devices (
  deviceId    TEXT PRIMARY KEY,
  displayName TEXT,
  secretHash  TEXT NOT NULL,
  pushToken   TEXT,
  createdAt   INTEGER NOT NULL,
  lastSeenAt  INTEGER NOT NULL
);
