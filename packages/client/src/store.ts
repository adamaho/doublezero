import jsonpatch from "fast-json-patch";
import { IDBPDatabase, openDB } from "idb";
import { makeObservable, observable, action } from "mobx";

const data_suffix = "d";
const patch_suffix = "p";

/**
 *
 * stores
 * {
 *    count: {
 *       push_url: "",
 *       pull_url: "",
 *       schema: zod schema
 *       initia_data: {},
 *       mutations: {
 *          increment: (c) => {
 *            return {
 *               ...c,
 *               count: c.count + 1
 *            }
 *          }
 *       }
 *    }
 * }
 */

export async function createStoreDB(
  name: string,
  stores: { name: string; initialData: any }[]
) {
  const db = await openDB(name, 1, {
    upgrade(db) {
      db.createObjectStore("store");
    },
  });

  let _stores: Record<string, Store> = {};

  const tx = db.transaction("store", "readwrite");
  for (const s of stores) {
    const initialData =
      (await tx.store.get(`${s.name}_${data_suffix}`)) ?? s.initialData;
    const store = new Store({ db, initialData, name: s.name });
    _stores[s.name] = store;
  }
  tx.done;

  return _stores;
}

type StoreContructorArgs = {
  db: IDBPDatabase;
  initialData: Record<string, any>;
  name: string;
};

export class Store {
  @observable data: Record<string, any>;

  private _db: IDBPDatabase;
  private _name: string;

  constructor({ db, initialData, name }: StoreContructorArgs) {
    makeObservable(this);

    this.data = initialData;
    this._db = db;
    this._name = name;
  }

  private async commit(oldData: typeof this.data, newData: typeof this.data) {
    const pKey = `${this._name}_${patch_suffix}`;
    const dKey = `${this._name}_${data_suffix}`;

    const patch = jsonpatch.compare(oldData, newData);
    const tx = this._db.transaction("store", "readwrite");

    // save the patch to the db
    const currPatch = (await tx.store.get(pKey)) ?? [];
    await tx.store.put([...currPatch, ...patch], pKey);

    // apply patch to db
    const currData = (await tx.store.get(dKey)) ?? {};
    const patchedData = jsonpatch.applyPatch(currData, patch);
    await tx.store.put(patchedData.newDocument, dKey);
    await tx.done;
  }

  @action mutate = (cb: (data: typeof this.data) => any) => {
    const oldData = { ...this.data };
    const newData = cb(this.data);
    this.commit(oldData, newData);
    this.data = newData;
  };
}
