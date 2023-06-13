import { useContext, useState, createContext, useEffect } from "react";

import { create00Cache, type DoubleZeroCache } from "@doublezero/core";

import { z } from "zod";

import "./App.css";

const schema = {
  count: {
    key: "",
    value: z.object({
      count: z.number(),
    }),
  },
} as const;

function Counter() {
  const cache = useContext(DoubleZeroContext);

  return (
    <button onClick={() => cache?.insert("count").value({ count: 1 })}>
      click me
    </button>
  );
}

const DoubleZeroContext = createContext<
  DoubleZeroCache<typeof schema> | undefined
>(undefined);

function App() {
  const [cache, setCache] = useState<
    DoubleZeroCache<typeof schema> | undefined
  >();

  useEffect(() => {
    async function initCache() {
      const cache = await create00Cache("bub", schema);
      setCache(cache);
    }

    initCache();
  }, []);

  return (
    <DoubleZeroContext.Provider value={cache}>
      <Counter />
    </DoubleZeroContext.Provider>
  );
}

export default App;
