import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

async function loadSceneData(): Promise<unknown> {
  const embedded = document.getElementById("excalidraw-data");
  if (embedded?.textContent) {
    return JSON.parse(embedded.textContent);
  }

  // Dev fallback: `npm run dev` has no build-time inlining step, so load
  // the scene from spaces/ via the dev-only middleware (see vite.config.ts).
  const slug = new URLSearchParams(window.location.search).get("space");
  if (!slug) {
    throw new Error('Nenhum espaço definido. Use "?space=<nome>" na URL (dev).');
  }
  const response = await fetch(`/api/dev-space?slug=${encodeURIComponent(slug)}`);
  if (!response.ok) {
    throw new Error(`Espaço "${slug}" não encontrado em spaces/.`);
  }
  return response.json();
}

loadSceneData()
  .then((scene) => {
    ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <App scene={scene as never} />
      </React.StrictMode>,
    );
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    document.getElementById("root")!.innerHTML =
      `<pre style="padding:2rem;font-family:monospace;white-space:pre-wrap;">${message}</pre>`;
  });
