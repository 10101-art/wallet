# Overview

`@10101art/wallet` is an embedded Ethereum wallet SDK for web applications.

The SDK provides:

- account creation/import and encrypted local persistence
- wallet lock/unlock behavior with auto-lock timeout
- transaction and signature methods (`eth_sendTransaction`, `personal_sign`)
- a Wagmi connector factory for app-level wallet integration
- browser push notification subscription via the wallet Service Worker RPC

## High-Level Behavior

The SDK has two execution modes:

- primary mode: Service Worker RPC (`EmbeddedWalletRpc`)
- fallback mode: in-page local wallet implementation (`EmbeddedWalletImplementation`)

At startup, the proxy attempts Service Worker mode first. If initialization fails, it switches to the local fallback provider.

## Main Exported APIs

From `index.mjs`:

- default export: `EmbeddedWalletProxy` class
- named export: `embedded10101WalletConnector(...)` for Wagmi
- named export: `subscribeToNotifications(userToken, apiPath)`

## Typical Integrator Responsibilities

- initialize the wallet/proxy
- listen for SDK events (login, sign, transaction, password requests)
- provide UI approvals and emit corresponding `*_provided` / `*_approved` events back
- select and update RPC provider URL when needed
