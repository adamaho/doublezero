import { makeObservable, observable, action } from "mobx";
import { openDB, type IDBPDatabase } from "idb";
import jsonpatch, { type Observer } from "fast-json-patch";

export * from "./store";

abstract class Store {
  abstract createStore(db: IDBPDatabase): void;
  abstract new(db: IDBPDatabase): Promise<Store>;
}

export async function createDB(name: string) {
  return await openDB(name, 1, {
    upgrade(db) {
      db.createObjectStore("store", {
        keyPath: "id"
      }) 
    },
  });
}

type Todo = {
  id: string;
  title: string;
  checked: boolean;
};

type Todos = Record<string, Todo>;

// @ts-ignore Can't implement abstract static method
export class TodoStore extends Store {
  static storeName = "todos";

  @observable private _todos: Todos = {};
  private _db: IDBPDatabase;
  private _observer: Observer<Todos>;

  constructor(db: IDBPDatabase, todos: Todos) {
    super();
    makeObservable(this);
    this._db = db;
    this._todos = todos;
    this._observer = jsonpatch.observe<Todos>(this._todos);
  }

  static createStore(db: IDBPDatabase) {
    db.createObjectStore(TodoStore.storeName);
  }

  /**
   * Instantiates the mobx store and creates the store in the database
   */
  static async new(db: IDBPDatabase) {
    const allTodos =
      (
        (await db.getAll(TodoStore.storeName, "data")) as [Record<string, Todo>]
      )[0] ?? {};
    const todos: Todos = {};
    for (const [id, t] of Object.entries(allTodos)) {
      todos[id] = t;
    }
    return new TodoStore(db, todos);
  }

  /**
   * Returns all of the todos from the store
   */
  get todos() {
    return this._todos;
  }

  savePatch() {
    const patch = jsonpatch.generate(this._observer);
    console.log(patch);
  }

  /**
   * Takes any changes made to the mobx store and generates a patch and applies it to the indexeddb
   */
  async saveToDB() {
    const patch = jsonpatch.generate(this._observer);
    const tx = this._db.transaction(TodoStore.storeName, "readwrite");

    // save the patch to the db
    const currPatch = await tx.store.get("patch") ?? [];
    await tx.store.put([...currPatch, ...patch], "patch");

    // apply patch to db
    const currTodos = (await tx.store.get("data")) ?? {};
    const newTodos = jsonpatch.applyPatch<Todos>(currTodos, patch);
    await tx.store.put(newTodos.newDocument, "data");
    await tx.done;
  }

  /**
   * Adds a todo to the list
   */
  @action
  async addTodo(todo: Omit<Todo, "id">) {
    const i = {
      id: crypto.randomUUID(),
      ...todo,
    };
    this._todos[i.id] = i;
    this.saveToDB();
  }

  /**
   * Toggles the todo checked state
   */
  @action
  async toggleTodo(id: string) {
    const i = this._todos[id];

    if (!i) {
      return;
    }

    const newItem = {
      ...i,
      checked: !i.checked,
    };

    this._todos[id] = newItem;
    this.saveToDB();
  }

  /**
   * Deletes a todo
   */
  @action
  async deleteTodo(id: string) {
    const t = this._todos;
    delete t[id];
    this._todos = t;
    this.saveToDB();
  }
}
