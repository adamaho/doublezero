import type { Component } from "solid-js";

import logo from "./logo.svg";
import styles from "./App.module.css";

import { create00Cache } from "./doublezero";

const stores = await create00Cache("bub", {
  count: {
    initial_data: {
      count: 0,
    },
  },
});

const App: Component = () => {
  return (
    <div class={styles.App}>
      <button onClick={() => stores.count.set_data((c) => ({ ...c, count: c.count + 1 }))}>
        +
      </button>
      <button onClick={() => stores.count.set_data((c) => ({ ...c, count: c.count - 1 }))}>
        -
      </button>
      <div>{stores.count.data().count}</div>
    </div>
  );
};

export default App;
