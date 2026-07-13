import path from "node:path";
import fs from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const spacesDir = path.resolve(__dirname, "../spaces");

// Dev-only endpoint so `npm run dev` can load a space by name (?space=SOM)
// without needing the build-time inlining step. Never runs in production.
function devSpaceApiPlugin(): Plugin {
  return {
    name: "dev-space-api",
    configureServer(server) {
      server.middlewares.use("/api/dev-space", (req, res) => {
        const url = new URL(req.url ?? "", "http://localhost");
        const slug = url.searchParams.get("slug");
        if (!slug) {
          res.statusCode = 400;
          res.end("Missing slug query param");
          return;
        }
        const filePath = path.join(spacesDir, `${slug}.excalidraw`);
        if (!fs.existsSync(filePath)) {
          res.statusCode = 404;
          res.end(`Space "${slug}" not found in spaces/`);
          return;
        }
        res.setHeader("Content-Type", "application/json");
        res.end(fs.readFileSync(filePath, "utf-8"));
      });
    },
  };
}

export default defineConfig({
  base: "/excalidraw-dash/",
  plugins: [react(), devSpaceApiPlugin()],
});
