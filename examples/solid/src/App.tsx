import {
  createSignal,
  type Component,
  Show,
  onMount,
  onCleanup,
  createEffect,
} from "solid-js";

import { applyPatch, type Operation } from "fast-json-patch";

import styles from "./App.module.css";

const SERVER_URL = "https://localhost:3001";

function register_client() {
  return fetch(`${SERVER_URL}/client`, { credentials: "include" });
}

function update_cursor_position(mutations: { x: number; y: number }[]) {
  return fetch(`${SERVER_URL}/cursor`, {
    method: "POST",
    body: JSON.stringify(mutations),
    credentials: "include",
  });
}

const App: Component = () => {
  const [client_id, set_client_id] = createSignal("");
  const [cursors, set_cursors] = createSignal({});

  const [pending_mutations, set_pending_mutations] = createSignal<
    { x: number; y: number }[]
  >([]);

  /**
   * Handle showing data for all cursors
   */
  onMount(async () => {
    const client_response = await register_client();
    const body = (await client_response.json()) as { client_id: string };

    if (body) {
      set_client_id(body.client_id);
    }

    const cursor_response = await fetch(`${SERVER_URL}/cursor`, {
      headers: { "Content-Type": "application/json-patch+json" },
      credentials: "include",
    });

    if (!cursor_response.body) {
      return;
    }

    const decoder = new TextDecoder();
    const reader = cursor_response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (value) {
        const ps = decoder.decode(value);
        let patch: Operation[];
        // server cant keep up and it seems some patches are coming down the pipe incorrectly
        try {
          patch = JSON.parse(ps);
        } catch (e) {
          patch = [];
          console.log(e, ps);
        }
        updateCursors(patch);
      }
    }
  });

  /**
   *
   * @param patch
   */
  function updateCursors(patch: Operation[]) {
    set_cursors((c) => {
      const copy = { ...c };
      return applyPatch(copy, patch).newDocument;
    });
  }

  /**
   *
   */
  async function send_request() {
    if (pending_mutations().length > 0) {
      await update_cursor_position(pending_mutations()).catch((e) => console.log(e));
      set_pending_mutations([]);
    }
  }

  onMount(() => {
    setInterval(() => {
      send_request();
    }, 1000);
  });

  /**
   *
   * Handles updating the store with the latest cursor state
   *
   * @param e {MouseEvent} The mouse event for the cursor
   */
  async function handleMouseMove(e: MouseEvent) {
    set_pending_mutations((c) => {
      return [...c, { x: e.x, y: e.y }];
    });
  }

  /**
   * Subscribe to mouse move event on document
   */
  onMount(() => {
    document.addEventListener("mousemove", handleMouseMove);
  });

  /**
   * Remove the event listener when the component unmounts
   */
  onCleanup(() => {
    document.removeEventListener("mousemove", handleMouseMove);
  });

  createEffect(() => {
    console.log(cursors());
  });

  return <div class={styles.App}></div>;
};

export default App;
