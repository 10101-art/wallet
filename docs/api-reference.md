# API Reference

## Module Exports

From `index.mjs`:

- default: `EmbeddedWalletProxy`
- `embedded10101WalletConnector({ network, chains, options })`
- `subscribeToNotifications(userToken, apiPath)`

## `EmbeddedWalletProxy`

Primary facade used by application code. Delegates internally to RPC provider or local fallback provider.

### Lifecycle

- `init(): Promise<any>`
  - initializes RPC provider first
  - falls back to local provider on init error
- `switchToFallback(): Promise<void>`
- `changeProvider(urlOrProvider): Promise<any>`

### Wallet and Account

- `eth_chainId(): Promise<number|bigint>`
- `getGasPrice(): Promise<string>`
- `getBalance(address): Promise<string>`
- `getAddress(): Promise<string>`
- `isAuthorized(): Promise<boolean>`
- `hasSavedAccount(): Promise<boolean>`
- `changeAccountPassword(oldPassword, newPassword): Promise<any>`
- `getEncryptedAccount(): Promise<string|null>`
- `setEncryptedAccount(encryptedKey, accountName = "mainAccount"): Promise<any>`
- `removeEncryptedAccount(accountName = "mainAccount"): Promise<any>`
- `loadAccountByPrivateKey(privateKey, password = "", accountName = "mainAccount"): Promise<any>`
- `loadAccount(password, accountName = "mainAccount"): Promise<any>`
- `generateNewAccount(password = "", accountName = "mainAccount", userRecoveryPassword = null): Promise<object>`
- `recoverAccount(recoveryKey, userRecoveryPassword, newPassword): Promise<boolean>`
- `extractRecoveryKeyData(recoveryKey): Promise<object|null>`
- `getPrivateKey(accountName = "mainAccount"): Promise<string>`
  - note: this method requests password through events (`password_request` / `password_provided`)

### Locking

- `isLocked(): Promise<boolean>`
- `unlock(password): Promise<any>`
- `lock(): Promise<any>`

### Signing and Transactions

- `personal_sign(message, address): Promise<string>`
- `eth_sendTransaction({ data, from, to }): Promise<string>`

### Generic RPC-like Entry

- `request({ method, params? }): Promise<any>`

### Health

- `isEverythingOk(): Promise<{rpcStatus: boolean, error?: string}>`

## Events Emitted by `EmbeddedWalletProxy`

- `password_request`
- `personal_sign_request`
- `eth_sendTransaction_request`
- `login_request`
- `login_error`
- `account_loaded`
- `account_action_request`
- `private_key_provided`

Expected callback events to be emitted by the integrator UI:

- `password_provided` / `password_rejected`
- `personal_sign_approved` / `personal_sign_rejected`
- `eth_sendTransaction_approved` / `eth_sendTransaction_rejected`
- `login_provided` / `login_rejected`
- `account_action_provided` / `account_action_rejected`

## `embedded10101WalletConnector(...)`

Creates Wagmi connector using SDK wallet.

Connector behavior highlights:

- `getProvider()` returns singleton wallet proxy
- `connect({ isReconnecting })` runs account onboarding/login flow via events
- `disconnect()` removes encrypted account
- `isAuthorized()` delegates to wallet
- `getChainId()` delegates to wallet

## `subscribeToNotifications(userToken, apiPath)`

Starts push polling flow through Service Worker RPC:

- checks Service Worker and Notification API support
- requests notification permission if needed
- calls worker RPC method `startPushHandler(userToken, apiPath)`

Worker then polls:

- `POST ${apiPath}/v2/profile/notifications/getPushNotifications`
- header: `Authorization: Bearer ${userToken}`

## `EmbeddedWalletImplementation` (Local Provider)

In-page implementation used as fallback and inside Service Worker host.

Key behavior:

- key generation/import/load with encrypted persistence
- auto-lock timer
- web3 account state in memory (`currentAccount`)

## `EmbeddedWalletRpc` (RPC Provider)

Service Worker client wrapper:

- registers worker at `/dist/service-worker.js`
- creates `ClientPageRPC`
- forwards wallet method calls as RPC messages
