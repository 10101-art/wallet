import {Web3} from "web3";
import Keystorage from "./modules/Keystorage.mjs";
import EventEmitter from 'events';
import Crypto from "./modules/Crypto.mjs";

const FIRST_ENDPOINT = 'https://cloudflare-eth.com';
const AUTOLOCK_TIMEOUT = 1000 * 30;

export default class EmbeddedWalletWorker extends EventEmitter {
    currentAccount = null;

    constructor(urlOrProvider) {
        super();
        this.urlOrProvider = urlOrProvider;
        this.web3 = this.web3i();
        this.locked = true;

    }

    web3i() {
        if (this.web3) {
            return this.web3;
        }

        this.web3 = new Web3(this.urlOrProvider);

        return this.web3;
    }

    async changeProvider(urlOrProvider) {
        // console.log('NEW PROVIDER', urlOrProvider)
        this.urlOrProvider = urlOrProvider;
        delete this.web3;
        this.web3 = this.web3i();
    }

    /*
    В userRecoveryPassword надо запихивать пароль прилетающий при создании аккаунта от сервера в поле userRecoveryPassword
     */
    async generateNewAccount(password = '', accountName = 'mainAccount', userRecoveryPassword = null) {
        await this.#startAutolockTimer(1800000); //Даём больше времени перед блокировкой

        if (!password || password.trim().length === 0) {
            throw new Error('Password is required');
        }

        //Generate new account
        let account = this.web3.eth.accounts.create();
        let privateKey = account.privateKey;

        //Save it to encrypted local storage
        let encryptedKey = await Keystorage.save(privateKey, password, accountName);

        //Если задан серверный пароль для восстановления
        let restoreEncodedKey = null;
        if (userRecoveryPassword) {//То создаём дополнительный ключ
            restoreEncodedKey = await Keystorage.save(privateKey, userRecoveryPassword, 'restoreEncodedKey');
        }

        //Load it to web3 wallet
        await this.#loadWeb3AccountByPrivateKey(privateKey);

        return {
            address: account.address,
            encryptedKey,
            privateKey,
            recoveryKey: this.#convertRestoreEncodedKeyToRecoveryKey(restoreEncodedKey, userRecoveryPassword)
        };
    }

    #convertRestoreEncodedKeyToRecoveryKey(restoreEncodedKey, userRecoveryPassword) {
        if (!restoreEncodedKey) {
            return null;
        }


        let restorePasswordHash = Crypto.hash(userRecoveryPassword);
        let versionByte = '0';
        return versionByte + Crypto.base64(JSON.stringify({a: restoreEncodedKey, b: restorePasswordHash}));
    }

    extractRecoveryKeyData(recoveryKey) {
        try {
            let versionByte = recoveryKey[0];
            let data = recoveryKey.substr(1);
            let decodedData = JSON.parse(Crypto.base64Decode(data));
            return {versionByte, passwordHash: decodedData.b, restoreEncodedKey: decodedData.a};
        } catch (e) {
            return null;
        }
    }

    async recoverAccount(recoveryKey, userRecoveryPassword, newPassword) {
        let data = this.extractRecoveryKeyData(recoveryKey);
        if (!data) {
            throw new Error('Invalid recovery key or password');
        }

        await this.setEncryptedAccount(data.restoreEncodedKey, 'mainAccount');

        await this.changeAccountPassword(userRecoveryPassword, newPassword, 'mainAccount');

        return true;
    }

    #startAutolockTimer(timeout = AUTOLOCK_TIMEOUT) {
        this.locked = false;
        if (this.autolockTimer) {
            return;
            //clearTimeout(this.autolockTimer);
        }
        this.autolockTimer = setTimeout(async () => {
            console.log('Autolock');
            await this.#lock();
            this.autolockTimer = null;
        }, timeout);
    }

    async #lock() {
        this.locked = true;
        await this.#unloadWeb3Account();
        clearTimeout(this.autolockTimer);
        this.autolockTimer = null;
    }


    async loadAccount(password, accountName = 'mainAccount') {
        let privateKey = await Keystorage.load(password, accountName);
        await this.#loadWeb3AccountByPrivateKey(privateKey);
        this.#startAutolockTimer();
    }

    async changeAccountPassword(oldPassword, newPassword, accountName = 'mainAccount') {
        await Keystorage.changeEcnryptedAccountPassword(oldPassword, newPassword, accountName);
    }

    async getPrivateKet(password, accountName = 'mainAccount') {
        return await Keystorage.load(password, accountName);
    }

    async getEncryptedAccount(accountName = 'mainAccount') {
        return await Keystorage.getEncryptedAccount(accountName);
    }

    async setEncryptedAccount(encryptedKey, accountName = 'mainAccount') {
        await Keystorage.setEncryptedAccount(encryptedKey, accountName);
    }

    async removeEncryptedAccount(accountName = 'mainAccount') {
        return await Keystorage.removeEncryptedAccount(accountName);
    }

    async #loadWeb3AccountByPrivateKey(privateKey) {
        await this.#unloadWeb3Account(); //Unload active account to prevent key leak
        const account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
        await this.web3.eth.accounts.wallet.add(account);
        this.currentAccount = account;
    }

    async loadAccountByPrivateKey(privateKey, password = '', accountName = 'mainAccount') {
        await this.#loadWeb3AccountByPrivateKey(privateKey);
        await Keystorage.save(privateKey, password, accountName);
        this.#startAutolockTimer();
    }

    async #unloadWeb3Account() {
        try {
            this.web3.eth.accounts.wallet.remove(this.currentAccount);
        } catch (e) {
        }
        this.currentAccount = null;
    }


    async getAddress() {
        return this.currentAccount.address;
    }

    async isAuthorized() {
        return this.currentAccount !== null;
    }

    async isLocked() {
        return this.locked;
    }

    async unlock(password) {
        if (!this.locked) {
            return;
        }

        let privateKey = await Keystorage.load(password);
        await this.#loadWeb3AccountByPrivateKey(privateKey);
        await this.#startAutolockTimer();
    }

    async lock(){
        await this.#lock();
    }

    async hasSavedAccount() {
        return (await Keystorage.getEncryptedAccount()) !== null;
    }

    async getBalance(address) {
        return await this.web3.eth.getBalance(address);
    }

    async getGasPrice() {
        const gasPrice = await this.web3.eth.getGasPrice();
        return this.web3.utils.toWei((parseFloat(this.web3.utils.fromWei(gasPrice, 'gwei')) * 1.5).toString(), 'gwei');
    }

    /**
     * Simulate RPC provider
     * @param method
     * @param params
     * @returns {Promise<*>}
     */
    async request(rpc) {
        console.log('request', arguments);
        if (!rpc.params) {
            rpc.params = [];
        }
        return await this[rpc.method](...rpc.params);
    }


    //Provider methods
    async personal_sign(message, address) {
        return (await this.currentAccount.sign(message)).signature;
    }

    async eth_chainId() {
        return await this.web3i().eth.getChainId();
    }

    async eth_sendTransaction({data, from, to}) {
        let signedTx = await this.currentAccount.signTransaction({...tx, gasPrice: await this.getGasPrice()});
        this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        return signedTx.transactionHash;
    }
}

//export default EmbeddedWallet;


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

    let worker = new EmbeddedWalletWorker(FIRST_ENDPOINT);


    const RPC = new HostRPC();
    self.RPC = RPC;

    RPC.methods = {
        eth_chainId: worker.eth_chainId.bind(worker),
        getGasPrice: worker.getGasPrice.bind(worker),
        generateNewAccount: worker.generateNewAccount.bind(worker),
        loadAccount: worker.loadAccount.bind(worker),
        getAddress: worker.getAddress.bind(worker),
        isAuthorized: worker.isAuthorized.bind(worker),
        hasSavedAccount: worker.hasSavedAccount.bind(worker),
        getBalance: worker.getBalance.bind(worker),
        getEncryptedAccount: worker.getEncryptedAccount.bind(worker),
        setEncryptedAccount: worker.setEncryptedAccount.bind(worker),
        removeEncryptedAccount: worker.removeEncryptedAccount.bind(worker),
        loadAccountByPrivateKey: worker.loadAccountByPrivateKey.bind(worker),
        changeProvider: worker.changeProvider.bind(worker),
        personal_sign: worker.personal_sign.bind(worker),
        eth_sendTransaction: worker.eth_sendTransaction.bind(worker),
        isLocked: worker.isLocked.bind(worker),
        unlock: worker.unlock.bind(worker),
        changeAccountPassword: worker.changeAccountPassword.bind(worker),
        getPrivateKet: worker.getPrivateKet.bind(worker),
        recoverAccount: worker.recoverAccount.bind(worker),
        extractRecoveryKeyData: worker.extractRecoveryKeyData.bind(worker),
        lock: worker.lock.bind(worker)
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
