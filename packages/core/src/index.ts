import { type IDBPDatabase, openDB } from "idb";

import { DoubleZeroSchema, InferDoubleZeroType, store, number } from "./schema";

/* -------------------------------------------------------------------------------------
 * DoubleZeroAdd
 * -------------------------------------------------------------------------------------*/
class DoubleZeroAdd<V> {
  private _db: IDBPDatabase;
  private _storeName: string;

  constructor(db: IDBPDatabase, storeName: string) {
    this._db = db;
    this._storeName = storeName;
  }

  value = async (v: V) => {
    await this._db.add(this._storeName, v);
  };
}

/* -------------------------------------------------------------------------------------
 * DoubleZeroGet
 * -------------------------------------------------------------------------------------*/
class DoubleZeroGet<S> {
  private _db: IDBPDatabase;
  private _storeName: string;

  constructor(db: IDBPDatabase, storeName: string) {
    this._db = db;
    this._storeName = storeName;
  }

  where = async () => {
    await this._db.get(this._storeName, "title");
  };
}

/* -------------------------------------------------------------------------------------
 * DoubleZeroCache
 * -------------------------------------------------------------------------------------*/
/**
 *
 * Initializes the cache and exposes methods for creating, updating and deleting data
 * from the cache
 *
 * @class
 * @constructor
 * @private
 */
class DoubleZeroCache<S extends DoubleZeroSchema> {
  private _db: IDBPDatabase;
  private _schema: S;

  /**
   * @param db The IDB instance
   */
  constructor(db: IDBPDatabase, schema: S) {
    this._db = db;
    this._schema = schema;
  }

  add = <T extends keyof S>(
    storeName: T
  ): DoubleZeroAdd<InferDoubleZeroType<S[T]>> => {
    return new DoubleZeroAdd(this._db, storeName as string);
  };

  getAll = <T extends keyof S>(
    storeName: T
  ): DoubleZeroGet<InferDoubleZeroType<S[T]>> => {
    return new DoubleZeroGet(this._db, storeName as string);
  };
}

/* -------------------------------------------------------------------------------------
 * Create the cache
 * -------------------------------------------------------------------------------------*/
/**
 *
 * Creates a new instance of the 00 cache
 *
 * @param name The name of the cache
 * @param schema The schema to create the cache with. Also helps with type inference.
 * @param version The current version of the database
 *
 */
async function create00Cache<S extends DoubleZeroSchema>(
  name: string,
  schema: S,
  version = 1
) {
  const c = await openDB<any>(name, version, {
    upgrade(db) {
      for (const s of Object.values(schema)) {
        db.createObjectStore(s.name, s.options);
      }
    },
  });

  return new DoubleZeroCache<S>(c, schema);
}

export { create00Cache, number, store };
export type { DoubleZeroSchema, DoubleZeroCache };
