import { openDB, type IDBPDatabase } from "idb";

import { z } from "zod";

/**
 *
 * const schema = {
 *   todos: store("todos", {
 *     id: number().primaryKey({ autoIncrement: true }),
 *     label: string({ unique: false }),
 *     checked: boolean()
 *   })
 * } 
 *
 */



/* ***** */

type DoubleZeroDB = IDBPDatabase;

type DoubleZeroStore = {
  key: IDBValidKey;
  value: z.ZodType<any>;
  indexes?: {
    [s: string]: {
      keyPath: string | string[];
      options?: IDBIndexParameters;
    };
  };
};

type DoubleZeroSchema = Record<string, DoubleZeroStore>;

/**
 *
 * Represents an insert query builder that provides the ability to add
 * new data to the database
 *
 * @class
 * @constructor
 * @private
 *
 */
class DoubleZeroInsertBuilder<S extends z.ZodType<any>> {
  private db: DoubleZeroDB;
  private store: string;

  /**
   * @param db The IDB instance
   * @param store The key of the store to add the data to
   */
  constructor(db: DoubleZeroDB, store: string) {
    this.db = db;
    this.store = store;
  }

  async value(v: z.infer<S>) {
    const tx = this.db.transaction(this.store, "readwrite");
    const store = tx.objectStore(this.store);
    await store.put(v, "foo");
    await tx.done;
  }
}

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
  private db: DoubleZeroDB;

  /**
   * @param db The IDB instance
   */
  constructor(db: DoubleZeroDB) {
    this.db = db;
  }

  insert(store: keyof S): DoubleZeroInsertBuilder<S[keyof S]["values"]> {
    return new DoubleZeroInsertBuilder(this.db, store as string);
  }
}

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
      for (const [s, v] of Object.entries(schema)) {
        const store = db.createObjectStore(s);

        if (v.indexes) {
          for (const [n, k] of Object.entries(v.indexes)) {
            store.createIndex(n, k.keyPath, k.options);
          }
        }
      }
    },
  });

  return new DoubleZeroCache<typeof schema>(c);
}

export { create00Cache };
export type { DoubleZeroSchema, DoubleZeroCache };
