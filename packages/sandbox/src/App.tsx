import { useState } from "react";
import { observer } from "mobx-react";

import { createDB, TodoStore } from "@doublezero/client";

const s = await createDB("bub", {
  todos: TodoStore
});

console.log(s);

function TodoInput() {
  const [title, setTitle] = useState("");

  return (
    <div>
      <input onChange={(e) => setTitle(e.target.value)} />
      <button
        onClick={() => {
          setTitle("");
          s.todos.addTodo({ title, checked: false });
        }}
      >
        Add
      </button>
    </div>
  );
}

const TodoList = observer((props: { store: TodoStore }) => {
  return (
    <ul>
      {Object.entries(props.store.data).map(([id, todo]) => {
        return (
          <li key={id}>
            {todo.title}
            <input
              type="checkbox"
              checked={todo.checked}
              onChange={() => s.todos.toggleTodo(id)}
            />
            <button onClick={() => s.todos.deleteTodo(id)}>delete</button>
          </li>
        );
      })}
    </ul>
  );
});

function App() {
  return (
    <>
      <TodoInput />
      <TodoList store={s.todos} />
    </>
  );
}

export default App;
