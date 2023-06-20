import jsonpatch from "fast-json-patch";
import { IDBPDatabase, openDB } from "idb";
import { makeObservable, observable, action } from "mobx";

export async function createStoreDB(name: string, stores: { name: string; initialData: any }[]) {

  const db = await openDB(name, 1, {
    upgrade(db) {
      db.createObjectStore("store")  
    },
  });

  let foo: Record<string, Store> = {};

  const tx = db.transaction("store", "readwrite");
  for (const s of stores) {
    const initialData = await tx.store.get(`${s.name}_d`) ?? s.initialData; 
    const store = new Store({ db, initialData, name: s.name, schema: "" });
    foo[s.name] = store;
  }
  tx.done;

  return foo;
}

type StoreContructorArgs = {
  db: IDBPDatabase;
  initialData: Record<string, any>;
  name: string;
  schema: string;
};

export class Store {
  
  @observable data: Record<string, any>;
  
  private _db: IDBPDatabase;
  private _name: string;
  private _schema: string;

  constructor({db, initialData, name, schema }: StoreContructorArgs) {
    makeObservable(this);

    this.data = initialData;
    this._db = db;
    this._name = name;
    this._schema = schema
  }

  private async commit(oldData: typeof this.data, newData: typeof this.data) {
    const pKey = `${this._name}_p`;
    const dKey = `${this._name}_d`;

    const patch = jsonpatch.compare(oldData, newData);
    const tx = this._db.transaction("store", "readwrite");
  
    // save the patch to the db
    const currPatch = await tx.store.get(pKey) ?? [];
    await tx.store.put([...currPatch, ...patch], pKey);
  
    // apply patch to db
    const currData = (await tx.store.get(dKey)) ?? {};
    const patchedData = jsonpatch.applyPatch(currData, patch);
    await tx.store.put(patchedData.newDocument, dKey);
    await tx.done;
    this.data = newData;
  }
 
  @action mutate = (cb: (data: typeof this.data) => any) => {
    const oldData = {...this.data};
    const newData = cb(this.data);
    this.commit(oldData, newData);
  }
} 
