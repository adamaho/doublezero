import { type IDBPDatabase, openDB } from "idb";

import {
  DoubleZeroSchema,
  InferDoubleZeroType,
  schema,
  store,
  string,
} from "./schema";

/* -------------------------------------------------------------------------------------
 * DoubleZeroInsert 
 * -------------------------------------------------------------------------------------*/
class DoubleZeroInsert<V> {
  private _db: IDBPDatabase;
  private _storeName: string;

  constructor(db: IDBPDatabase, storeName: string) {
    this._db = db;
    this._storeName = storeName;
  }

  value(v: V) {
    // do the thing with the value here
  }
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
class DoubleZeroCache<S extends DoubleZeroSchema<any>> {
  private _db: IDBPDatabase;
  private _schema: S;

  /**
   * @param db The IDB instance
   */
  constructor(db: IDBPDatabase, schema: S) {
    this._db = db;
    this._schema = schema;
  }

  insert<T extends keyof InferDoubleZeroType<S>>(
    storeName: T
  ): DoubleZeroInsert<InferDoubleZeroType<S>[T]> {
    return new DoubleZeroInsert(this._db, storeName as string);
  }
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
async function create00Cache<S extends DoubleZeroSchema<any>>(
  name: string,
  schema: S,
  version = 1
) {
  const c = await openDB<any>(name, version, {
    upgrade(db) {
      // create the stores and indexes here
    },
  });

  return new DoubleZeroCache<S>(c, schema);
}

export { create00Cache };

/* -------------------------------------------------------------------------------------
 * Demo 
 * -------------------------------------------------------------------------------------*/
const thing = schema({
  todos: store("todos", {
    title: string(),
  }),
});

const db = await create00Cache("bub", thing);

// @ts-expect-error 
db.insert("todos").value({ title: 0 });

