# doublezero

An open source alternative to client-side prediction and server reconciliation. 

## Basics

Alright let's start with the basics. You might be asking yourself, *what the heck is client-side prediction?* or *scratch's head*, server reconcilliation?

Well they are just buzz terms for essentially syncing client and server state. Let's call it CSPSR. Many modern multiplayer games are built off of a similar premise. This isn't something that is super new or novel. Just a new open source solution that might help you in your next project.

## But Why?

Well, I'll be honest, the best apps that I have ever used have been instantly responsive. No spinners, instant writes, instant navigation and best of all available even when I don't have a connection to the internet. 

But that is just it, this is a solution for **apps**. I'm not talking your next hype beast sneaker e-commerce store. I'm talking dashboards and productivity apps. So this isnt a one size fits all solution, just another option.

## Architecture

### Client

All of the work happens on the client for the most part. Client sends a series of json patches with mutations that the server should reconcile. Given these mutations it performs the respective updates on the database assuming that it is can be done.


## Schema

[IndexDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB#basic_pattern) has a concept called stores. However, stores can only be created when the IDB is created or the version has changed.

### Creating a Store

Let's look into what it takes to create a todo store using the browser apis.

Assuming we have the following typescript type to define the schema of a todo item:

```typescript
type Todo = {
  title: string;
  checked: boolean;
}
```

Now let's create the store for our todos

```typescript
const todoStore = db.createObjectStore("todos");
```

Similar to traditional databases, we can specify a unique identifier for each row to make querying the data faster.

```typescript
// using a specific key in the object as a unique key
const todoStore = db.createObjectStore("todos", { keyPath: "title" }); 

// auto incrementing, more traditional db approach
const todoStore = db.createObjectStore("todos", { autoIncrement: true });
```

### Creating an Index

Now that we have our store created, it is time for us to create the fields for the store. In the case of our todo list, that is the `title` and `checked` fields.

```typescript

// create the title index
todoStore.createIndex("title", "title", { unique: true });

// create the checked index
todoStore.createIndex("checked", "checked", { unique: false });
```

It is important to remember that indexs are not typed. 


### API

With the understand of how to create stores and indexes, let's figure out how to design an api that makes this easier and typesafe.

```typescript

// Without the keypath specified

import { store, string, boolean } from "@doublezero/idb";

const todos = store("todos", {
  title: string("title", { unique: true }),
  checked: boolean("checked", { unique: false })
});

// with the keypath specified
const todos = store("todos", {
  title: string("title", { unique: true }),
  checked: boolean("checked", { unique: false })
}, {
  keyPath: "title"
});
```



