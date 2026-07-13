import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

interface ExcalidrawScene {
  elements?: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
}

export default function App({ scene }: { scene: ExcalidrawScene }) {
  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <Excalidraw
        viewModeEnabled
        initialData={{
          elements: scene.elements ?? [],
          appState: { ...(scene.appState ?? {}), viewModeEnabled: true },
          files: scene.files,
        }}
      />
    </div>
  );
}
