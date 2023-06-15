import { makeObservable, observable, action } from "mobx";

export class Count {
  @observable value = 0;

  constructor(value: number) {
    makeObservable(this);

    this.value = value;
  }

  get count() {
    return this.value;
  }

  @action
  increment() {
    this.value++;
  }

  @action
  decrement() {
    this.value--;
  }
}

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
}
