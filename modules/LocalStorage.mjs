import IndexedDBKeyValueStore from "./IndexedDBKeyValueStore.mjs";

let data = {};

let idb = new IndexedDBKeyValueStore('walletData', 'data');

class LocalStorage {

    constructor() {

    }

    static async setItem(key, value) {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, value);
            return;
        }

        try {
            await idb.set(key, value);
        }catch (e) {
            data[key] = value;
        }


    }

    static async removeItem(key) {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(key);
            return;
        }

        try {
            await idb.delete(key);
        }catch (e) {
            delete data[key];
        }

    }

    static async getItem(key) {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(key);
        }

        try {

            return await idb.get(key);
        }catch (e) {
            return data[key];
        }

        //  return data[key];
    }
}

export default LocalStorage;
