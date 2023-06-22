import { useState } from "react";
import { observer } from "mobx-react";

import { create00Cache } from "@doublezero/mobx";

const stores = await create00Cache("bub", {
  todos: {
    initial_data: {},
  },
  count: {
    initial_data: {
      count: 0,
    },
  },
});

function TodoInput() {
  const [title, setTitle] = useState("");

  return (
    <div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <button
        onClick={() => {
          setTitle("");
          stores.todos.mutate((c) => {
            const id = crypto.randomUUID();
            return {
              ...c,
              [id]: {
                id,
                title,
                checked: false,
              },
            };
          });
        }}
      >
        Add
      </button>
    </div>
  );
}

const TodoList = observer(() => {
  return (
    <ul>
      {Object.entries(stores.todos.data).map(([id, todo]) => {
        return (
          <li key={id}>
            {todo.title}
            <input
              type="checkbox"
              checked={todo.checked}
              onChange={() =>
                stores.todos.mutate((c) => {
                  return {
                    ...c,
                    [id]: {
                      ...c[id],
                      checked: !c[id].checked,
                    },
                  };
                })
              }
            />
            <button
              onClick={() =>
                stores.todos.mutate((c) => {
                  const todos = { ...c };
                  delete todos[id];
                  return todos;
                })
              }
            >
              delete
            </button>
          </li>
        );
      })}
    </ul>
  );
});

const Count = observer(() => {
  return (
    <div>
      <button onClick={() => stores.count.mutate((c) => ({ ...c, count: c.count + 1 }))}>
        Increment
      </button>
      <button onClick={() => stores.count.mutate((c) => ({ ...c, count: c.count - 1 }))}>
        Decrement
      </button>
      <button onClick={() => stores.count.mutate((c) => ({ ...c, count: c.count * 2 }))}>
        Double
      </button>
      {stores.count.data.count}
    </div>
  );
});

function App() {
  return (
    <>
      <TodoInput />
      <TodoList />
      <Count />
    </>
  );
}

export default App;
