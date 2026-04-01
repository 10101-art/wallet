# Wagmi Integration Examples

## Connector Factory

Use `embedded10101WalletConnector` to integrate SDK wallet into Wagmi.

```js
import { createConfig, http } from "@wagmi/core";
import { mainnet } from "@wagmi/core/chains";
import { embedded10101WalletConnector } from "@10101art/wallet";

const config = createConfig({
  chains: [mainnet],
  connectors: [
    embedded10101WalletConnector({
      network: {
        rpcUrls: { default: { http: ["https://cloudflare-eth.com"] } }
      },
      chains: [mainnet],
      options: {}
    })
  ],
  transports: {
    [mainnet.id]: http()
  }
});
```

## Attach UI Event Handlers Before Connect

```js
import EmbeddedWalletProxy from "@10101art/wallet";

const wallet = new EmbeddedWalletProxy();

wallet.on("login_request", () => {
  const password = prompt("Enter wallet password");
  if (password) wallet.emit("login_provided", password);
  else wallet.emit("login_rejected");
});

wallet.on("account_action_request", () => {
  // Example: default to account generation
  const password = prompt("Create wallet password");
  if (!password) return wallet.emit("account_action_rejected");

  wallet.emit("account_action_provided", {
    action: "generate",
    password
  });
});

wallet.on("personal_sign_request", ({ message, address }) => {
  const ok = confirm(`Sign message for ${address}?\n${message}`);
  if (ok) wallet.emit("personal_sign_approved");
  else wallet.emit("personal_sign_rejected");
});

wallet.on("eth_sendTransaction_request", (tx) => {
  const ok = confirm(`Send tx?\nfrom: ${tx.from}\nto: ${tx.to}`);
  if (ok) wallet.emit("eth_sendTransaction_approved", tx);
  else wallet.emit("eth_sendTransaction_rejected");
});
```

## Reconnection Behavior

Connector `connect({ isReconnecting: true })`:

- initializes wallet
- sets provider from connector network config
- returns current account and chain id without new onboarding prompts

## Disconnect Semantics

Connector `disconnect` and `disconnectAccount` remove encrypted account from storage via `removeEncryptedAccount()`.

Plan your product UX accordingly:

- if you need soft disconnect without data wipe, implement a custom disconnect strategy around lock/unlock instead of connector disconnect.
