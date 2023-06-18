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

So I am now wondering if it makes sense for the client to generate patches. I think it makes sense still. My current thought is that when a mutation happens client side, we save the mutation and a patch client side and then send the resulting patch to the server to be processed. The server can then decide which patches to apply and then send a new set of patches down to the client

An example of the outline of potential endpoints could be the following:

GET /todos - returns all todos
GET /todos with streaming header - returns all todos and a stream for the client
POST /todos - takes patches of todos 
  - every patch payload should have a timestamp and be formatted as the following

```js
{
  id: <uuid>,
  timestamp: <time>,
  patch: <array of patches>
}
```

So the flow of loading data when the app loads would be the following:

1. Populate store with data from indexeddb
2. Connect to streaming endpoint and update store and indexeddb with new data from the server
3. Subsequent updates from the server get saved to the mobx store and indexeddb

Flow of operations when executing mutations:

1. Update the mobx store [done]
2. Update indexeddb [done]
3. Generate patch [done]
4. Save patch to indexeddb
5. Send patch to server
6. Remove patch from indexeddb when server responds from POST saying that the patch was processed

I think there is a way to genericize my implementation such that we treat everything as a mutation and then save things to indexeddb as a keyval store instead. So long as we updated the mobx store we can generate a series of patches and use those to update indexeddb and then also send them to the server.

With that being said, I have figured out a way to genericize the updates to the database a little easier with a keyval store in stead. Now we can store the data along with all of the pending patches to send to the server in the same store. See the implementation below:

```typescript
import { makeObservable, observable, action } from "mobx";
import { openDB, type IDBPDatabase } from "idb";
import jsonpatch, { type Observer } from "fast-json-patch";

abstract class Store {
  abstract createStore(db: IDBPDatabase): void;
  abstract new(db: IDBPDatabase): Promise<Store>;
}

export async function createDB(name: string, stores: Store[]) {
  return await openDB(name, 1, {
    upgrade(db) {
      for (const Store of stores) {
        Store.createStore(db);
      }
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
```

So now we can make any number of mutations to the data and so long as we call the `saveToDB` method, our data will be saved to the indexeddb and a patch will be generated and appended in the database as well. This is great because now if the user wishes to work offline, we are keeping an ongoing record of updates they are making to the data at which point when they reconnect, we can send the patches to the server and replay them over the existing data to get up to date. After all, the server is the one that is the source of truth. So we will want to make sure that we are synced back up with its current state.



