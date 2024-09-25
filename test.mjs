import EmbeddedWalletWorker from "./service-worker.mjs";

let wallet = new EmbeddedWalletWorker('https://cloudflare-eth.com');

let recoveryKey = `0eyJhIjoie1wiY3RcIjpcIlg5SUdRWEFqZXF2d0x6eUwvUEFJcjljTlRQVnZzNmZPalpMRnZXZk9GR25TcFcwV1Y5ZUtLZkVLd3VSU0FKVG1pL3hCb3YzNE1BTTBEZ3orTVZxTU4vWkUrZDZ5N3N1RFNOZ3dLUTYraTdJPVwiLFwiaXZcIjpcImY0NzVmNjgzODQ0NmU4NDM0MGM5N2Q4YTc0NzYxZTRlXCIsXCJzXCI6XCI3YWI0YTBiYTRkYWYwMzVmXCJ9IiwiYiI6Ijk2NGIzZmVmNzIzNDk1ODM1MzY3YmI5NGNlM2I2MzA1MjNjMDRhNGNkY2U0MDI3ODA1ZmU4MzY4ZWE5ODI4N2MifQ==`;


console.log(await wallet.recoverAccount(recoveryKey, 'restorePassword', '123456'));

console.log(await wallet.loadAccount('123456'));

console.log(await wallet.currentAccount);
