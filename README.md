# doublezero

An open source alternative to client-side prediction and server reconciliation.

## Basics

Alright let's start with the basics. You might be asking yourself, _what the heck is client-side prediction?_ or _scratch's head_, server reconcilliation?

Well they are just buzz terms for essentially syncing client and server state. Let's call it CSPSR. Many modern multiplayer games are built off of a similar premise. This isn't something that is super new or novel. Just a new open source solution that might help you in your next project.

## But Why?

Well, I'll be honest, the best apps that I have ever used have been instantly responsive. No spinners, instant writes, instant navigation and best of all available even when I don't have a connection to the internet.

But that is just it, this is a solution for **apps**. I'm not talking your next hype beast sneaker e-commerce store. I'm talking dashboards and productivity apps. So this isnt a one size fits all solution, just another option.

## Architecture

### Client

My initial thoughts as of right now is that we can use mobx to handle all of the data. As I work more and more will applications in the frontend I am starting to realize how nice it is to separate your data layer from your presentation layer. I find often times in the world of frontend frameworks that the data is very closely tied to the presentation layer. While this is good from a DX perspective, I have found that it leads to more complexity in understanding the model of the application.

MobX provides us with the capability to easily separate the data layer through a series of reactive primitives. Components can observe specific pieces of data and re-render in order to keep the presentation up-to-date. Components can also call a series of user defined actions in order to update the data in the MobX stores.

In order to have full offline support for our users we need a client-side data store that is capable of persisting data from MobX. That means we need to reach for something like indexeddb. Which is a browser storage mechanism that can support large collections of structured data. You can think of it like a database for the frontend.

However, this comes with its own set of complexity when it comes to data residency and synchronization. Is MobX or IndexedDB the source of truth for the data? My initial thoughts as of right now is that MobX is the source of truth and is also going to be responsible for updating IndexedDB with the new data whenever a user performs an action to update the store. We can do that my making use of MobX reactions to react to changes in the data and persist them in IndexedDB.

We also need a way to subscribe to a stream of data from the server which tells us when another user has updated a specific state. You can imagine a situation where two users are modifying the same document. One user may make a change to update the document and we want the second user to see that change instantly. There fore we need a way for the server to communicate those changes to the client. We can do that by allowing the MobX store to call a streaming endpoint on the backend to ensure that the data in the store is always up-to-date with what the server has. Ultimately the server is the final source of truth for the data. We just want to the client to be able to hold its own without the need for the server.

Finally, we need a way to communicate the set up changes in the store to the server. We can do that by creating a JSON patch for each update to the store and persisting it in the store. That way when it comes time to sync with the server, we can send it a series of patches that it can then reconcile to determine what the current state of the world is from the backend perspective

Here is an example of how to make a simple todo store in mobx:

```typescript
import { makeObservable, observable, action } from "mobx";

type Todo = {
  title: string;
  checked: boolean;
};

export class TodoStore {
  @observable private _todos: Map<string, Todo> = new Map();

  constructor() {
    makeObservable(this);
  }

  get todos() {
    return this._todos;
  }

  @action
  addTodo(todo: Todo) {
    this._todos.set(crypto.randomUUID(), todo);
  }

  @action
  toggleTodo(id: string) {
    const item = this._todos.get(id);

    if (!item) {
      return;
    }

    const newItem = {
      ...item,
      checked: !item.checked,
    };

    this._todos.set(id, newItem);
  }

  @action
  deleteTodo(id: string) {
    const t = this._todos;
    t.delete(id);
    this._todos = t;
  }
}
```

What is nice about the above example is it encompasses all of the state you need to create and store todos. I think we can update this to support pulling from indexxdb when the class instantiated, presumably when the application first loads, but also enhance it to update indexxedb when actions are called.


### Connecting to IndexedDB

Now that we have a way to manipulate and observe application state, let's look into how we can persist that state across reloads and offline. Combining MobX with IndexedDB we can do something the following.

First we start by adding a couple static methods to our TodoStore.

```typescript
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
```

As you can see we added a `createStore` and `new` static method to the store. `createStore` is responsible for creating the store in indexeddb where we want to persist our data. The `new` method is responsible for fetching the current state from the store and instantiating the mobx store. That way when the user first loads the app, we can instantly show the data that is currently in their store as opposed to waiting for a network request.

Finally, we create a new function that allows us to create the database and stores for when the application first loads.

```typescript
export async function createDB(name: string, stores: Store[]) {
  return await openDB(name, 1, {
    upgrade(db) {
      for (const Store of stores) {
        Store.createStore(db);
      }
    },
  });
}
```

### Generating JSON Patches

[JSON patches](https://jsonpatch.com/) are a way to describe changes in a JSON document. We can use these patches to keep a log of changes that we want to sync with the server at some point in the future. So let's figure out how we can create these patches.
