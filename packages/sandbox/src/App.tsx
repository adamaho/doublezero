import { useState } from "react";
import { observer } from "mobx-react";

import { createDB, TodoStore } from "@doublezero/client";

const db = await createDB("bub", [TodoStore]);

const todos = await TodoStore.new(db);

function TodoInput() {
  const [title, setTitle] = useState("");

  return (
    <div>
      <input onChange={(e) => setTitle(e.target.value)} />
      <button
        onClick={() => {
          setTitle("");
          todos.addTodo({ title, checked: false });
        }}
      >
        Add
      </button>
    </div>
  );
}

const TodoList = observer((props: { todosStore: TodoStore }) => {
  return (
    <ul>
      {Object.entries(props.todosStore.todos).map(([id, todo]) => {
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
      <TodoInput />
      <TodoList todosStore={todos} />
    </>
  );
}

export default App;
