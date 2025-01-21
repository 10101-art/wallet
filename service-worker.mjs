
import EmbeddedWalletImplementation from "./EmbeddedWallet.mjs";

const FIRST_ENDPOINT = 'https://cloudflare-eth.com';



class HostRPC {
    requests = {};
    methods = {};
    debug = false;

    async broadcast(message) {
        if (this.debug) {
            console.log('Broadcasting', message);
        }
        for (const client of await clients.matchAll({includeUncontrolled: true, type: 'window'})) {
            client.postMessage(message);
        }
    }

    async request(id, method, params, event) {
        if (!params) {
            params = [];
        }
        //console.log('Request:', id, method, params);
        if (method in this.methods) {
            let result = null;
            let error = null;
            try {
                result = await this.methods[method](...params);
                // console.log('result ok', id);
            } catch (e) {
                // console.log('result error', id, e);
                error = e;
            }

            // console.log('Boradcasting', id);
            await this.broadcast({id, result, error});

        }
    }
}

try {

    let embeddedWallet = new EmbeddedWalletImplementation(FIRST_ENDPOINT);


    const RPC = new HostRPC();
    self.RPC = RPC;

    RPC.methods = {
        eth_chainId: embeddedWallet.eth_chainId.bind(embeddedWallet),
        getGasPrice: embeddedWallet.getGasPrice.bind(embeddedWallet),
        generateNewAccount: embeddedWallet.generateNewAccount.bind(embeddedWallet),
        loadAccount: embeddedWallet.loadAccount.bind(embeddedWallet),
        getAddress: embeddedWallet.getAddress.bind(embeddedWallet),
        isAuthorized: embeddedWallet.isAuthorized.bind(embeddedWallet),
        hasSavedAccount: embeddedWallet.hasSavedAccount.bind(embeddedWallet),
        getBalance: embeddedWallet.getBalance.bind(embeddedWallet),
        getEncryptedAccount: embeddedWallet.getEncryptedAccount.bind(embeddedWallet),
        setEncryptedAccount: embeddedWallet.setEncryptedAccount.bind(embeddedWallet),
        removeEncryptedAccount: embeddedWallet.removeEncryptedAccount.bind(embeddedWallet),
        loadAccountByPrivateKey: embeddedWallet.loadAccountByPrivateKey.bind(embeddedWallet),
        changeProvider: embeddedWallet.changeProvider.bind(embeddedWallet),
        personal_sign: embeddedWallet.personal_sign.bind(embeddedWallet),
        eth_sendTransaction: embeddedWallet.eth_sendTransaction.bind(embeddedWallet),
        isLocked: embeddedWallet.isLocked.bind(embeddedWallet),
        unlock: embeddedWallet.unlock.bind(embeddedWallet),
        changeAccountPassword: embeddedWallet.changeAccountPassword.bind(embeddedWallet),
        getPrivateKet: embeddedWallet.getPrivateKet.bind(embeddedWallet),
        getPrivateKey: embeddedWallet.getPrivateKey.bind(embeddedWallet),
        recoverAccount: embeddedWallet.recoverAccount.bind(embeddedWallet),
        extractRecoveryKeyData: embeddedWallet.extractRecoveryKeyData.bind(embeddedWallet),
        lock: embeddedWallet.lock.bind(embeddedWallet),
        isEverythingOk: embeddedWallet.isEverythingOk.bind(embeddedWallet)
    };

    console.log('Worker started');

    await RPC.broadcast({rpcstarted: true})

    setInterval(async () => {
        await RPC.broadcast({rpcstarted: true});
    }, 1000);

    self.addEventListener('activate', event => {
        console.log('Wallet: Service worker activated');
        event.waitUntil(clients.claim());
        console.log('Wallet: Service worker claimed clients');
    });

    self.addEventListener('install', function (event) {
        console.log('Wallet: Service worker installed');
        event.waitUntil(self.skipWaiting());
    });

    self.addEventListener('message', async event => {

        if (event.data.method) {
            await RPC.request(event.data.id, event.data.method, event.data.params, event);
        }

        // console.log('Received message:', event.data);
        // Обработка сообщения
    });

} catch (e) {
    console.error(e);
}
