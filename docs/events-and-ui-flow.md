# Events and UI Flow

`EmbeddedWalletProxy` extends `EventEmitter` and uses events for user interaction gates.

## Connect/Login Events

### Existing account path

Emitted by SDK:

- `login_request`

Expected app response:

- `login_provided` with password string
- or `login_rejected`

Possible result events:

- `account_loaded` on successful password/account load
- `login_error` with error object on invalid password or load failure

### New account/import path

Emitted by SDK:

- `account_action_request`

Expected app response:

- `account_action_provided` with object:
  - `{ action: "generate", password: "..." }`
  - or `{ action: "import", privateKey: "0x...", password: "..." }`
- or `account_action_rejected`

Additional emitted event:

- `private_key_provided` after generation path returns generated account object

## Sensitive Operation Events

### Private key request

Emitted by SDK:

- `password_request`

Expected app response:

- `password_provided` with password
- or `password_rejected`

### Personal sign

Emitted by SDK:

- `personal_sign_request` with `{ message, address }`

Expected app response:

- `personal_sign_approved`
- or `personal_sign_rejected`

If wallet is locked, SDK also requests password internally via `password_request`.

### Send transaction

Emitted by SDK:

- `eth_sendTransaction_request` with `{ data, from, to }`

Expected app response:

- `eth_sendTransaction_approved` with final tx object payload
- or `eth_sendTransaction_rejected`

If wallet is locked, SDK also requests password internally via `password_request`.

## Integration Notes

- Implement all required approval/rejection handlers before calling connect/sign/send methods.
- Reject flows explicitly to avoid hanging promises.
- Keep UI flow deterministic: one request event should map to exactly one user action response.
