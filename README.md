# Travel Rule · end-to-end encryption console

A React client for the [notabene-e2ee](../notabene-e2ee) Spring Boot server. It shows Travel Rule
transfers for every VASP, and lets you compose and send an editable IVMS101 message from one VASP to
another.

The point of the transfer detail view: **what the platform holds** next to **what your VASP can
decrypt from it**, side by side.

## Run

The server first, then the client:

```bash
cd ../notabene-e2ee && ./mvnw spring-boot:run
```

```bash
npm install && npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to `localhost:8080`, so it is same-origin in dev and
CORS never comes into it. Point it elsewhere with `API_TARGET=http://host:port npm run dev`.

## What's in it

**Transfers** — every VASP together with a VASP column, or one at a time. Click a row to expand it:
the stored ciphertext, the decrypted PII, the JWE header (`alg`, `enc`, the key it was encrypted to,
whether the `apu`/`apv` bindings are present), and a flat table of every decrypted field.

**Send** — pick from/to, pick `branch` or `field` encryption, edit the PII either through the form or
as raw IVMS101 JSON (the two stay in sync), and send. The response shows exactly what went over the
wire.

**Setup** — each VASP's `#pii` key and the DIDDoc entry to publish, plus a one-click encryption
self-test that runs the full round trip on the server with throwaway keys.

## The channel switch

Top right of Transfers and Send:

- **Notabene** — the live Transact V2 API.
- **Local** — an in-memory ledger on the Java server. Identical encryption, no network.

Local exists because Notabene will not hand out a counterparty key, or accept an encrypted
presentation, until your `#pii` key is published in the DID document — and for sandbox entities that
needs Notabene support to publish it. Until then a live send fails with:

```
404 NO_ENCRYPTION_KEYS — No encryption keys found in DID document
```

Listing live transfers works regardless, so the Notabene channel is still useful before then. On the
local channel you can exercise the whole encrypt → store → decrypt path today: send from vaspA, then
watch the same transfer appear as OUTGOING for vaspA and INCOMING for vaspB, and open vaspB's copy to
see it decrypt.

## Layout

| Path | What it does |
|---|---|
| `src/api.ts` | Typed wrapper over the server's REST API. |
| `src/pii.ts` | Get/set IVMS101 values by JSON path, so the form and the JSON editor share one object. |
| `src/components/TransfersView.tsx` | The table, VASP picker, channel switch. |
| `src/components/TransferDetailPanel.tsx` | Ciphertext vs plaintext, JWE header, field table. |
| `src/components/SendView.tsx` | Compose and send, form plus raw JSON. |
| `src/components/SetupView.tsx` | Keys, DIDDoc entries, encryption self-test. |
| `src/components/Json.tsx` | JSON viewer that highlights and shortens JWEs. |

No UI framework and no state library — three tabs did not warrant either.

## Server endpoints it uses

`GET /api/vasps` · `GET /api/transfers` · `GET /api/transfers/{id}` · `GET /api/samplePii` ·
`POST /api/send` · `GET /api/demo`
