import {
  type Accessor,
  type Setter,
  type Owner,
  createEffect,
  createSignal,
  createResource,
  getOwner,
  runWithOwner,
} from "solid-js";

import { openDB, type IDBPDatabase } from "idb";
import jsonpatch, { type Operation } from "fast-json-patch";

const store_name = "doublezero";

const data_suffix = "d";
const patch_suffix = "p";

/**
 * Instantiates a new doublezero cache
 *
 * @param name The name of the db to create
 * @param stores The stores to create and hold data to be stored in cache
 * @returns All of the stores
 */
export function create00Cache<K extends string>(
  name: string,
  stores: Record<K, { initial_data: any; mutate_url: string }>
) {
  // get the root owner so solid knows when to clean up these tracked signals
  const owner = getOwner();

  // create the stores in a resource
  const [allStores] = createResource(async () => {
    if (!owner) {
      throw new Error("Failed to get owner scope for effects");
    }

    const db = await openDB(name, 1, {
      upgrade(db) {
        db.createObjectStore(store_name);
      },
    });

    let _stores = <Record<K, { data: Accessor<any>; set_data: Setter<any> }>>{};

    const tx = db.transaction(store_name, "readwrite");
    for (const [name, s] of Object.entries(stores)) {
      const initial_data =
        (await tx.store.get(`${name}_${data_suffix}`)) ?? s.initial_data;
      _stores[name as K] = createStore({
        db,
        initial_data,
        name,
        owner,
        mutate_url: s.mutate_url,
      });
    }
    tx.done;

    return _stores;
  });

  return allStores;
}

/**
 * Creates a new store for the data
 *
 * @param {Object} options
 * @param {IDBPDatabase} options.db The idb database instance
 * @param {string} options.name The name of the store
 * @param {object} options.initial_data The initial data for the store
 * @param {object} options.mutate_url The url to send mutations to
 *
 * @returns The data and the mutator from the underlying solid signal
 */
function createStore({
  db,
  name,
  mutate_url,
  initial_data,
  owner,
}: {
  db: IDBPDatabase;
  name: string;
  mutate_url: string;
  initial_data: any;
  owner: Owner;
}) {
  const p_key = `${name}_${patch_suffix}`;
  const d_key = `${name}_${data_suffix}`;

  /**
   * Create a signal to keep track of the store data
   */
  const [data, set_data] = createSignal(initial_data);

  /**
   * Post mutations to the specified endpoint when it changes
   */
  function post_mutation(patch: Operation[]) {
    return fetch(mutate_url, {
      method: "POST",
      body: JSON.stringify(patch),
      credentials: "include",
    });
  }

  // save data to idb and generate patches
  runWithOwner(owner, () => {
    createEffect((prev) => {
      const updated = data();
      const patch = jsonpatch.compare(prev, updated);
      const tx = db.transaction(store_name, "readwrite");
      tx.store
        .get(p_key)
        .then((p) => {
          const curr_patch = p ?? [];
          tx.store.put([...curr_patch, ...patch], p_key).then(() => {
            tx.store.get(d_key).then((d) => {
              const curr_data = d ?? {};
              const patched_data = jsonpatch.applyPatch(curr_data, patch);
              tx.store.put(patched_data.newDocument, d_key).then(() => {
                tx.done.catch((err) => {
                  console.log(err);
                });
              });
            });
          });
        })
        .catch((err) => console.log(err));

      // post the patches to the mutation endpoint
      if (patch.length === 0) return;
      // post_mutation(patch).catch((err) => console.log(err));

      return updated;
    }, data());
  });

  return {
    data,
    set_data,
  };
}
