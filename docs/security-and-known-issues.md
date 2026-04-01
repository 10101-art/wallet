# Security and Known Issues

## Security Notes

### Key Material

- private keys are encrypted before persistence using `CryptoJS.AES`
- encrypted payload is stored in browser storage (`localStorage` by default)
- plaintext private key is kept in memory while account is loaded/unlocked

### Auto-Lock

- default auto-lock timeout: 30 seconds after load/unlock
- account generation path uses a longer temporary timeout (30 minutes)
- locking unloads account from web3 wallet memory

### Recovery Key

- optional recovery key is generated when `userRecoveryPassword` is provided
- recovery key includes:
  - encrypted account payload
  - hash of recovery password (`SHA256`)

### Frontend Threat Model Reminder

- this SDK runs in-browser; protect against XSS in host app
- if app is compromised, runtime key material and approval events can be intercepted
- enforce CSP and strict input sanitization in host UI

## Known Issues and Limitations (Current Code)

1. `eth_sendTransaction` bug in local implementation  
   In `EmbeddedWallet.mjs`, `eth_sendTransaction` signs `{...tx, ...}` but `tx` is undefined in scope. This can break local fallback transaction sending.

2. RPC init state flag may remain false  
   In `EmbeddedWalletRpc.mjs`, `this.inited = true` is placed after early returns and may never execute, causing repeated re-init attempts.

3. Service Worker dependency for primary mode  
   Primary mode requires Service Worker support and successful registration at `/dist/service-worker.js`. Without it, SDK falls back to local provider.

4. Hardcoded default RPC endpoint  
   Default endpoint is `https://cloudflare-eth.com` unless explicitly changed by consumer.

5. Connector disconnect is destructive for local account persistence  
   `disconnect`/`disconnectAccount` remove encrypted account from storage (not just session disconnect).

6. Notification polling model  
   Notifications are implemented as periodic fetch polling (5-minute interval), not native push subscription (`PushManager` flow).

## Recommended Internal Follow-Ups

1. Fix local transaction signing variable issue in `eth_sendTransaction`.
2. Make RPC `inited` state transition explicit and reliable.
3. Clarify/standardize disconnect semantics (`lock` vs storage wipe).
4. Add automated tests for event-driven approval and fallback behavior.
5. Add optional endpoint/config validation for production deployments.
