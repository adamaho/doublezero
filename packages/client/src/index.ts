import { makeObservable, observable, action } from "mobx";
import { openDB, type IDBPDatabase } from "idb";
import jsonpatch, { type Observer } from "fast-json-patch";


export async function createDB(name: string, stores: Record<string, any>) {
  const db = await openDB(name, 1, {
    upgrade(db) {
      for (const name of Object.keys(stores)) {
        db.createObjectStore(name);
      }
    },
  });

  let s: Record<string, any> = {};

  for (const [name, S] of Object.entries(stores)) {
    const data = await db.getAll(name, "data") as Record<string, any>;
    const store = new S(name, db, data); 
    s[name] = store;
  }

  return s;
}

class Store {
  public data: Record<string, any> = {};
  public db: IDBPDatabase;
  public name: string;
  public observer: Observer<any>;

  constructor(name: string, db: IDBPDatabase, data: any) {
    makeObservable(this, {
      data: observable,
    })

    this.db = db;
    this.name = name;
    this.data = data;
    this.observer = jsonpatch.observe(this.data);
  }

  /**
 * Takes any changes made to the mobx store and generates a patch and applies it to the indexeddb
 */
  saveToDB = async () => {
    const patch = jsonpatch.generate(this.observer);
    const tx = this.db.transaction(this.name, "readwrite");

    // save the patch to the db
    const currPatch = (await tx.store.get("patch")) ?? [];
    await tx.store.put([...currPatch, ...patch], "patch");

    // apply patch to db
    const currTodos = (await tx.store.get("data")) ?? {};
    const newTodos = jsonpatch.applyPatch(currTodos, patch);
    await tx.store.put(newTodos.newDocument, "data");
    await tx.done;
  }
}



type Todo = {
  id: string;
  title: string;
  checked: boolean;
};

export class TodoStore extends Store {
  constructor(name: string, db: IDBPDatabase, data: Record<string, any>) {
    super(name, db, data);

    makeObservable(this, {
      addTodo: action,
      toggleTodo: action,
      deleteTodo: action
    })
  }

  /**
   * Adds a todo to the list
   */
  addTodo = (todo: Omit<Todo, "id">) => {
    const i = {
      id: crypto.randomUUID(),
      ...todo,
    };
    this.data[i.id] = i;
    // this.saveToDB();
  }

  /**
   * Toggles the todo checked state
   */
  toggleTodo = (id: string) => {
    const i = this.data[id];

    if (!i) {
      return;
    }

    const newItem = {
      ...i,
      checked: !i.checked,
    };

    this.data[id] = newItem;
    // this.saveToDB();
  }

  /**
   * Deletes a todo
   */
  deleteTodo = (id: string) => {
    const t = this.data;
    delete t[id];
    this.data = t;
    // this.saveToDB();
  }
}
