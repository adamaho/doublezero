import { makeObservable, observable, action } from "mobx";
import { openDB, type IDBPDatabase } from "idb";

export async function createDB(name: string, stores: Store[]) {
  return await openDB(name, 1, {
    upgrade(db) {
      console.log("hereee");
      for (const Store of stores) {
        Store.createStore(db);
      }
    },
  });
}

abstract class Store {
  abstract createStore(db: IDBPDatabase): void;
  abstract new(db: IDBPDatabase): Promise<Store>;
}

type Todo = {
  id: string;
  title: string;
  checked: boolean;
};

// @ts-ignore Can't implement abstract static method
export class TodoStore extends Store {
  store = "todos";

  @observable private _todos: Map<string, Todo> = new Map();
  private _db: IDBPDatabase;

  constructor(db: IDBPDatabase, todos: Map<string, Todo>) {
    super();
    makeObservable(this);
    this._db = db;
    this._todos = todos;
  }

  static createStore(db: IDBPDatabase) {
    db.createObjectStore("todos", {
      keyPath: "id",
    });
  }

  static async new(db: IDBPDatabase) {
    const todos = (await db.getAll("todos")) as Todo[];

    const t = new Map(todos.length > 0 ? todos.map((t) => [t.id, t]) : []);

    console.log(t);

    return new TodoStore(db, t);
  }

  get todos() {
    return this._todos;
  }

  @action
  async addTodo(todo: Omit<Todo, "id">) {
    const i = {
      id: crypto.randomUUID(),
      ...todo,
    };
    this._todos.set(i.id, i);
    await this._db.put("todos", i);
  }

  @action
  async toggleTodo(id: string) {
    const i = this._todos.get(id);

    if (!i) {
      return;
    }

    const newItem = {
      ...i,
      checked: !i.checked,
    };

    this._todos.set(id, newItem);
    await this._db.put("todos", newItem);
  }

  @action
  async deleteTodo(id: string) {
    const t = this._todos;
    t.delete(id);
    this._todos = t;

    await this._db.delete("todos", id);
  }
}
