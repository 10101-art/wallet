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

let notificationClickHandlerRegistred = false;
let pushHandlerInterval = null;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function startPushHandler(userToken) {
    console.log('Push handler started', userToken);

    clearInterval(pushHandlerInterval);

    async function pushRequest() {
        try {

            let result = await fetch('/v2/profile/notifications/getPushNotifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + userToken
                },
                body: JSON.stringify({limit: 5})
            });


            let notifications = await result.json();
            console.log('Push notifications', notifications);

            for (let notification of notifications) {
                await self.registration.showNotification(notification.data.title || notification.message, {
                    body: notification.message,
                    icon: notification.data.icon || '/images/favicon-32x32.png',
                    data: notification.data.data || {},
                });

                await wait(5000);
            }


        } catch (e) {
            console.error('Error in pushRequest', e);
        }
    }

    pushHandlerInterval = setInterval(pushRequest, 300000);
    await pushRequest();
}

self.addEventListener('notificationclick', event => {
    console.log('Notification click', event);
    event.notification.close();

    const urlToOpen = event.notification?.data?.url || '/';
    event.waitUntil(
        clients.matchAll({type: 'window', includeUncontrolled: true}).then(clientList => {
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});


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
        isEverythingOk: embeddedWallet.isEverythingOk.bind(embeddedWallet),
        startPushHandler: startPushHandler
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
