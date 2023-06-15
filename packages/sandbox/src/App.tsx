import { useState } from "react";
import { observer } from "mobx-react";

import { Count, TodoStore } from "@doublezero/client";

const count = new Count(0);

function Counter() {
  return (
    <div>
      <button onClick={() => count.increment()}>increment</button>
      <button onClick={() => count.decrement()}>decrement</button>
    </div>
  );
}

const CountDisplay = observer((props: { store: Count }) => {
  return <div>{props.store.count}</div>;
});

const todos = new TodoStore();

function TodoInput() {
  const [title, setTitle] = useState("");

  return (
    <div>
      <input onChange={(e) => setTitle(e.target.value)} />
      <button onClick={() => todos.addTodo({ title, checked: false })}>
        Add
      </button>
    </div>
  );
}

const TodoList = observer((props: { todosStore: TodoStore }) => {
  return (
    <ul>
      {Array.from(props.todosStore.todos).map(([id, todo]) => {
        return (
          <li key={id}>
            {todo.title}
            <input
              type="checkbox"
              checked={todo.checked}
              onChange={() => todos.toggleTodo(id)}
            />
            <button onClick={() => todos.deleteTodo(id)}>delete</button>
          </li>
        );
      })}
    </ul>
  );
});

function App() {
  return (
    <>
      <Counter />
      <CountDisplay store={count} />

      <TodoInput />
      <TodoList todosStore={todos} />
    </>
  );
}

export default App;
