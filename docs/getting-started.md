# Getting Started

## Install

```bash
npm install @10101art/wallet
```

## Minimal Usage

```js
import EmbeddedWalletProxy from "@10101art/wallet";

const wallet = new EmbeddedWalletProxy();
await wallet.init();
await wallet.changeProvider("https://cloudflare-eth.com");
```

## Basic Account Flow

```js
// Create and persist a new account
const created = await wallet.generateNewAccount("strong-password");
console.log(created.address);

// Load existing account from encrypted storage
await wallet.loadAccount("strong-password");
console.log(await wallet.getAddress());
```

## Signature Flow (with UI approval event)

```js
wallet.on("personal_sign_request", ({ message, address }) => {
  // show UI to user
  const approved = true;
  if (approved) wallet.emit("personal_sign_approved");
  else wallet.emit("personal_sign_rejected");
});

const address = await wallet.getAddress();
const sig = await wallet.personal_sign("hello", address);
```

## Transaction Flow (with UI approval event)

```js
wallet.on("eth_sendTransaction_request", (tx) => {
  // show tx details in UI
  const approved = true;
  if (approved) wallet.emit("eth_sendTransaction_approved", tx);
  else wallet.emit("eth_sendTransaction_rejected");
});

const txHash = await wallet.eth_sendTransaction({
  from: "0x...",
  to: "0x...",
  data: "0x"
});
```

## Notifications

```js
import { subscribeToNotifications } from "@10101art/wallet";

await subscribeToNotifications(userToken, apiBaseUrl);
```

Requirements:

- browser with Service Worker support
- notification permission granted by user
