import { createSignal, type Component, For, batch, Show } from "solid-js";

import styles from "./App.module.css";

import { create00Cache } from "@doublezero/solid";

const App: Component = () => {
  const [title, set_title] = createSignal("");

  const stores = create00Cache("bub", {
    count: {
      initial_data: {
        count: 0,
      },
    },
    todos: {
      initial_data: {},
    },
  });

  return (
    <Show when={stores()}>
      <div class={styles.App}>
        <button
          onClick={() => stores()?.count.set_data((c) => ({ ...c, count: c.count + 1 }))}
        >
          +
        </button>
        <button
          onClick={() => stores()?.count.set_data((c) => ({ ...c, count: c.count - 1 }))}
        >
          -
        </button>
        <div>count: {stores()?.count.data().count}</div>

        <div>
          <input value={title()} onInput={(e) => set_title(e.target.value)} />
          <button
            onClick={() => {
              batch(() => {
                stores()?.todos.set_data((c) => {
                  const id = crypto.randomUUID();
                  return {
                    ...c,
                    [id]: {
                      id,
                      title: title(),
                      checked: false,
                    },
                  };
                });
                set_title("");
              });
            }}
          >
            add
          </button>
        </div>
        <ul>
          <For each={Object.entries(stores()?.todos.data())}>
            {([id, t]) => {
              return (
                <li>
                  {t.title}
                  <input
                    type="checkbox"
                    checked={t.checked}
                    onChange={(e) =>
                      stores()?.todos.set_data((c) => {
                        return {
                          ...c,
                          [id]: {
                            ...c[id],
                            checked: e.target.checked,
                          },
                        };
                      })
                    }
                  />
                  <button
                    onClick={() => {
                      stores()?.todos.set_data((c) => {
                        const curr = { ...c };
                        delete curr[id];

                        return curr;
                      });
                    }}
                  >
                    delete
                  </button>
                </li>
              );
            }}
          </For>
        </ul>
      </div>
    </Show>
  );
};

export default App;
