# Architecture

## Components

- `EmbeddedWalletProxy` (`index.mjs`)
- `EmbeddedWalletRpc` (`EmbeddedWalletRpc.mjs`)
- `EmbeddedWalletImplementation` (`EmbeddedWallet.mjs`)
- Service Worker host RPC (`service-worker.mjs`)
- storage/crypto modules (`modules/*.mjs`)

## Data and Control Flow

1. App code interacts with `EmbeddedWalletProxy`.
2. Proxy delegates calls to currently selected provider.
3. Default provider is `EmbeddedWalletRpc` (Service Worker RPC bridge).
4. On RPC init failure, proxy switches to local provider (`EmbeddedWalletImplementation`).
5. Local implementation uses:
   - `web3` for account/signing/transaction primitives
   - `Keystorage` + `Crypto` + `LocalStorage` for encrypted key persistence

## Service Worker RPC Path

- Service Worker script path: `/dist/service-worker.js`
- Browser page side:
  - `ClientPageRPC` sends request messages to `registration.active`
  - waits for responses keyed by request `id`
- Worker side:
  - `HostRPC` routes method calls to wallet methods
  - broadcasts `{id, result, error}` back to client pages

## Provider Selection

- initial selected provider: RPC proxy (`EmbeddedWalletRpc`)
- fallback selected provider: local in-page implementation (`EmbeddedWalletImplementation`)
- method `switchToFallback()` forces fallback mode
- method `changeProvider(urlOrProvider)` updates active provider endpoint

## Storage

- preferred backend: `localStorage`
- fallback backend: `IndexedDB` object store
- final in-memory fallback object if IndexedDB fails

Encrypted account key name format:

- `ecryptedKey_${accountName}` (note: key name in code intentionally uses this exact spelling)

## Locking Model

- wallet starts in locked mode
- account load/import/unlock starts auto-lock timer
- default auto-lock: 30s
- account generation uses longer timeout (30 minutes)
- lock unloads active account from in-memory web3 wallet
