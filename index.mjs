import {createConnector} from "@wagmi/core";
import EventEmitter from 'events';
import FrontendWindows from "./modules/FrontendWindows.mjs";
import EmbeddedWalletImplementation from "./EmbeddedWallet.mjs";
import EmbeddedWalletRpc from "./EmbeddedWalletRpc.mjs";


const FIRST_ENDPOINT = 'https://cloudflare-eth.com';

const embeddedWallet = new EmbeddedWalletImplementation(FIRST_ENDPOINT);
const embeddedWalletRpcProxy = new EmbeddedWalletRpc(FIRST_ENDPOINT);

let selectedWalletProvider = embeddedWalletRpcProxy;

class EmbeddedWalletProxy extends EventEmitter {
    constructor(urlOrProvider) {
        super();
        this.urlOrProvider = urlOrProvider;
        this.inited = false;
    }

    ifInitialized() {
        this.inited = true;
    }

    async init() {
        try {
            return await embeddedWalletRpcProxy.init();
        } catch (e) {
            console.error('Error:', e);
            console.log('Switching to fallback local wallet');

            selectedWalletProvider = embeddedWallet;
            return await selectedWalletProvider.init();
        }
    }

    async switchToFallback() {
        selectedWalletProvider = embeddedWallet;
        await selectedWalletProvider.init();
    }

    async changeProvider(urlOrProvider) {
        this.urlOrProvider = urlOrProvider;
        return await selectedWalletProvider.changeProvider(urlOrProvider);
    }

    async eth_chainId() {
        return await selectedWalletProvider.eth_chainId();
    }

    async getGasPrice() {
        return await selectedWalletProvider.getGasPrice();
    }

    async getBalance(address) {
        return await selectedWalletProvider.getBalance(address);
    }

    async getAddress() {
        return await selectedWalletProvider.getAddress();
    }

    async isAuthorized() {
        return await selectedWalletProvider.isAuthorized();
    }

    async hasSavedAccount() {
        return await selectedWalletProvider.hasSavedAccount();
    }

    async changeAccountPassword(oldPassword, newPassword) {
        return await selectedWalletProvider.changeAccountPassword(oldPassword, newPassword);
    }

    async getEncryptedAccount() {
        return await selectedWalletProvider.getEncryptedAccount();
    }

    async setEncryptedAccount(encryptedKey, accountName = 'mainAccount') {
        return await selectedWalletProvider.setEncryptedAccount(encryptedKey, accountName);
    }

    async removeEncryptedAccount(accountName = 'mainAccount') {
        return await selectedWalletProvider.removeEncryptedAccount(accountName);
    }

    async loadAccountByPrivateKey(privateKey, password = '', accountName = 'mainAccount') {
        return await selectedWalletProvider.loadAccountByPrivateKey(privateKey, password, accountName);
    }

    async loadAccount(password, accountName = 'mainAccount') {
        return await selectedWalletProvider.loadAccount(password, accountName);
    }

    async generateNewAccount(password = '', accountName = 'mainAccount', userRecoveryPassword = null) {
        return await selectedWalletProvider.generateNewAccount(password, accountName, userRecoveryPassword);
    }

    async recoverAccount(recoveryKey, userRecoveryPassword, newPassword) {
        return await selectedWalletProvider.recoverAccount(recoveryKey, userRecoveryPassword, newPassword);
    }

    async extractRecoveryKeyData(recoveryKey) {
        return await selectedWalletProvider.extractRecoveryKeyData(recoveryKey);
    }

    async getPrivateKey(accountName = 'mainAccount') {
        this.emit('password_request');

        try {
            const password = await new Promise((resolve, reject) => {
                this.once('password_provided', resolve);
                this.once('password_rejected', () => {
                    reject('User rejected the password request.');
                });
            });

            return await selectedWalletProvider.getPrivateKey(password, accountName);
        } catch (error) {
            console.error('Error', error);
            throw error;
        }
    }

    async isLocked() {
        return await selectedWalletProvider.isLocked();
    }

    async unlock(password) {
        return await selectedWalletProvider.unlock(password);
    }

    async lock() {
        return await selectedWalletProvider.lock();
    }

    async personal_sign(message, address) {

        console.log('REquest personal sign', message, address);

        let isLocked = await this.isLocked();

        console.log('isLocked', isLocked);

        this.emit('personal_sign_request', {message, address});

        try {
            await new Promise((resolve, reject) => {
                this.once('personal_sign_approved', resolve);
                this.once('personal_sign_rejected', () => {
                    reject(new Error('User rejected the sign request.'));
                });
            });

            if (isLocked) {
                console.log('2isLocked', isLocked);
                await this.unlock(await FrontendWindows.requestPassword(this));
            }

            return await selectedWalletProvider.personal_sign(message, address);
        } catch (error) {
            console.error('Error during personal sign:', error);
            throw error;
        }
    }

    async eth_sendTransaction({data, from, to}) {

        let isLocked = await this.isLocked();

        this.emit('eth_sendTransaction_request', {data, from, to});

        try {
            const tx = await new Promise((resolve, reject) => {
                this.once('eth_sendTransaction_approved', resolve);
                this.once('eth_sendTransaction_rejected', () => {
                    reject(new Error('User rejected the transaction request.'));
                });
            });

            if (isLocked) {
                await this.unlock(await FrontendWindows.requestPassword(this));
            }

            return await selectedWalletProvider.eth_sendTransaction(tx);
        } catch (error) {
            console.error('Error during transaction send:', error);
            throw error;
        }
    }

    async request(rpc) {
        console.log('request', arguments);
        if (!rpc.params) {
            rpc.params = [];
        }
        return await this[rpc.method](...rpc.params);
    }

    async isEverythingOk() {
        try {
            return await selectedWalletProvider.isEverythingOk();
        } catch (error) {
            console.error('Error checking status:', error);
            return {
                rpcStatus: false,
                error: error.message
            };
        }
    }
}

export default EmbeddedWalletProxy;


let wallet = new EmbeddedWalletProxy(null);

wallet.init(); //TODO я хуй знает куда это вставить в асинхронном режиме, так что будет такой костыль, надеюсь будет работать

if (typeof window !== 'undefined') {
    if (!window.web310101Wallet) {
        window.web310101Wallet = wallet;
    } else {
        wallet = window.web310101Wallet;
    }
}


export function embedded10101WalletConnector({
                                                 network,
                                                 chains,
                                                 options
                                             }) {
    console.log('embedded10101WalletConnector', network, chains, options);
    console.log(network.rpcUrls.default.http);
    //let wallet = new EmbeddedWallet(network.rpcUrls.default.http[0]);


    let id = 'embedded10101';
    let name = 'Embedded 10101';
    let type = 'wallet';


    return createConnector((config) => {

        return {
            id,
            name,
            type,
            getProvider: async function () {
                return wallet;
            },
            connect: async function ({isReconnecting}) {
                await wallet.init();
                await wallet.changeProvider(network.rpcUrls.default.http[0]);

                if (isReconnecting) {
                    return {
                        accounts: [await wallet.getAddress()],
                        chainId: await wallet.eth_chainId()
                    };
                }


                try {
                    if (await wallet.hasSavedAccount()) {
                        wallet.emit('login_request');

                        const password = await new Promise((resolve, reject) => {
                            wallet.once('login_provided', resolve);
                            wallet.once('login_rejected', () => {
                                reject(new Error('User rejected the password request.'));
                            });
                        });

                        try {
                            await wallet.loadAccount(password);
                            wallet.emit('account_loaded');
                        } catch (e) {
                            wallet.emit('login_error', e);
                            console.error('Invalid password', e);
                            throw e;
                        }
                    } else {
                        wallet.emit('account_action_request');

                        const {action, privateKey, password} = await new Promise((resolve, reject) => {
                            wallet.once('account_action_provided', resolve);
                            wallet.once('account_action_rejected', () => {
                                reject(new Error('User rejected the account action request.'));
                            });
                        });

                        if (action === 'generate') {
                            const generatedAccount = await wallet.generateNewAccount(password);
                            wallet.emit('private_key_provided', generatedAccount);
                            await wallet.loadAccount(password);
                        } else if (action === 'import') {
                            await wallet.loadAccountByPrivateKey(privateKey, password);
                        } else {
                            throw new Error("Invalid action. Please provide 'generate' or 'import'.");
                        }
                    }

                    return {
                        accounts: [await wallet.getAddress()],
                        chainId: await wallet.eth_chainId()
                    };

                } catch (e) {
                    console.error('Error during connect', e);
                    throw e;
                }
            },
            getAccounts: async function () {
                return [await wallet.getAddress()];
            },
            onConnect: async function () {
            },
            disconnect: async function () {
                await wallet.removeEncryptedAccount();
            },
            disconnectAccount: async function () {
                console.log('disconnectAccount');
                await wallet.removeEncryptedAccount();
            },
            isAuthorized: async function () {
                return await wallet.isAuthorized();
            },
            onDisconnect: async function () {
            },
            getChainId: async function () {
                return await wallet.eth_chainId();
            },
            onAccountsChanged: async function () {
            },
            onMessage: async function () {
                console.log('onMessage', arguments);
            },
            switchChain: async function () {

            }

        }
    })
}

export async function subscribeToNotifications(userToken, apiPath) {

    if (!('serviceWorker' in navigator)) {
        throw new Error('Service worker not supported');
    }

    if (!'Notification' in window) {
        throw new Error('Notification not supported');
    }

    async function startWorkerPush() {
        await embeddedWalletRpcProxy.RPC.request('startPushHandler', [userToken, apiPath]);
    }

    if (Notification.permission !== 'granted') {
        let permission = await Notification.requestPermission();
        if (permission === 'granted') {
            await startWorkerPush();
        } else {
            throw new Error('User declined subscription');
        }
    } else {
        await startWorkerPush();
    }

}

if (typeof window !== 'undefined') {
    window.subscribeToNotifications = subscribeToNotifications;
}
