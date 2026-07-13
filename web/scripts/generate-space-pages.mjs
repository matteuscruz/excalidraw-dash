import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(webDir, "..");
const spacesDir = path.join(rootDir, "spaces");
const distDir = path.join(webDir, "dist");

const builtIndexPath = path.join(distDir, "index.html");
if (!fs.existsSync(builtIndexPath)) {
  console.error("dist/index.html não encontrado — rode `vite build` antes deste script.");
  process.exit(1);
}
const appShellHtml = fs.readFileSync(builtIndexPath, "utf-8");

if (!fs.existsSync(spacesDir)) {
  console.error(`Pasta de espaços não encontrada: ${spacesDir}`);
  process.exit(1);
}

const spaceFiles = fs
  .readdirSync(spacesDir)
  .filter((name) => name.endsWith(".excalidraw"))
  .sort();

if (spaceFiles.length === 0) {
  console.warn("Nenhum arquivo .excalidraw encontrado em spaces/.");
}

const slugs = [];

for (const fileName of spaceFiles) {
  const slug = path.basename(fileName, ".excalidraw");
  slugs.push(slug);

  const sceneRaw = fs.readFileSync(path.join(spacesDir, fileName), "utf-8");
  JSON.parse(sceneRaw); // valida que é JSON válido antes de embutir na página

  // "\/" é um escape válido em JSON e volta a virar "/" no JSON.parse (main.tsx),
  // isso evita que o JSON embutido feche a tag <script> ao redor por engano.
  const sceneEscaped = sceneRaw.replace(/<\//g, "<\\/");

  const pageHtml = appShellHtml.replace(
    "</head>",
    `  <script type="application/json" id="excalidraw-data">${sceneEscaped}</script>\n</head>`,
  );

  const slugDir = path.join(distDir, slug);
  fs.mkdirSync(slugDir, { recursive: true });
  fs.writeFileSync(path.join(slugDir, "index.html"), pageHtml, "utf-8");
  console.log(`Gerado dist/${slug}/index.html`);
}

const listItems = slugs
  .map((slug) => `      <li><a href="./${slug}/">${slug}</a></li>`)
  .join("\n");

const indexHtml = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Excalidraw Spaces</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem; }
      ul { padding-left: 1.25rem; }
      li { margin: 0.5rem 0; }
    </style>
  </head>
  <body>
    <h1>Excalidraw Spaces</h1>
    <ul>
${listItems}
    </ul>
  </body>
</html>
`;

fs.writeFileSync(path.join(distDir, "index.html"), indexHtml, "utf-8");
console.log("Reescrito dist/index.html (listagem pública).");
