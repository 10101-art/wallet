import EventEmitter from "events";
import ClientPageRPC from "./modules/ClientPageRPC.mjs";
const SERVICE_WORKER_URL = '/dist/service-worker.js';
export default class EmbeddedWalletRpc extends EventEmitter {
    constructor(urlOrProvider) {
        super();
        this.urlOrProvider = urlOrProvider;
        this.inited = false;
        /** @type {ClientPageRPC} */
        this.RPC = null;
    }

    ifInitialized() {
        this.inited = true;
    }

    async init() {
        console.log('Wallet: Init');
        if (this.inited) {
            return this.RPC;
        }

        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
            try {
                console.log('Wallet: Service worker registration...');
                const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL);
                console.log('Wallet: Service worker registered:', registration);

                //await 120 sec
                await new Promise((resolve, reject) => { setTimeout(resolve, 120000); });

                this.RPC = new ClientPageRPC(registration);
                window.RPC = this.RPC;

                await this.RPC.waitForActive();

                if (this.urlOrProvider) {
                    await this.changeProvider(this.urlOrProvider);
                }


                return this.RPC;

            } catch (error) {
                console.error('Wallet: Service worker registration failed:', error);
                throw error;
            }

        }else{
            throw new Error('Service worker is not supported');
        }

        this.inited = true;
    }

    async changeProvider(urlOrProvider) {
        //console.log('!!!changeProvider', urlOrProvider);
        this.urlOrProvider = urlOrProvider;
        return await this.RPC.request('changeProvider', [urlOrProvider]);
    }

    async eth_chainId() {
        return Number(await this.RPC.request('eth_chainId'));
    }

    async getGasPrice() {
        return await this.RPC.request('getGasPrice');
    }

    async getBalance(address) {
        return await this.RPC.request('getBalance', [address]);
    }

    async getAddress() {
        return await this.RPC.request('getAddress');
    }

    async isAuthorized() {
        return await this.RPC.request('isAuthorized');
    }

    async hasSavedAccount() {
        return await this.RPC.request('hasSavedAccount');
    }

    async changeAccountPassword(oldPassword, newPassword) {
        return await this.RPC.request('changeAccountPassword', [oldPassword, newPassword]);
    }

    async getEncryptedAccount() {
        return await this.RPC.request('getEncryptedAccount');
    }

    async setEncryptedAccount(encryptedKey, accountName = 'mainAccount') {
        return await this.RPC.request('setEncryptedAccount', [encryptedKey, accountName]);
    }

    async removeEncryptedAccount(accountName = 'mainAccount') {
        return await this.RPC.request('removeEncryptedAccount', [accountName]);
    }

    async loadAccountByPrivateKey(privateKey, password = '', accountName = 'mainAccount') {
        return await this.RPC.request('loadAccountByPrivateKey', [privateKey, password, accountName]);
    }

    async loadAccount(password, accountName = 'mainAccount') {
        return await this.RPC.request('loadAccount', [password, accountName]);
    }

    async generateNewAccount(password = '', accountName = 'mainAccount', userRecoveryPassword = null) {
        return await this.RPC.request('generateNewAccount', [password, accountName, userRecoveryPassword]);
    }

    async recoverAccount(recoveryKey, userRecoveryPassword, newPassword) {
        return await this.RPC.request('recoverAccount', [recoveryKey, userRecoveryPassword, newPassword]);
    }

    async extractRecoveryKeyData(recoveryKey) {
        return await this.RPC.request('extractRecoveryKeyData', [recoveryKey]);
    }

    async getPrivateKey(password, accountName = 'mainAccount') {
        return await this.RPC.request('getPrivateKey', [password, accountName]);
    }

    async isLocked() {
        return await this.RPC.request('isLocked');
    }

    async unlock(password) {
        return await this.RPC.request('unlock', [password]);
    }

    async lock(){
        return await this.RPC.request('lock',[]);
    }

    async personal_sign(message, address) {
        return await this.RPC.request('personal_sign', [message, address]);
    }

    async eth_sendTransaction({data, from, to}) {
        return await this.RPC.request('eth_sendTransaction', [{data, from, to}]);
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
            const status = await this.RPC.request('isEverythingOk');
            return status;
        } catch (error) {
            console.error('Error checking status:', error);
            return {
                rpcStatus: false,
                error: error.message
            };
        }
    }
}
