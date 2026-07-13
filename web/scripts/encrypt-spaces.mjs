import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(webDir, "..");
const spacesDir = path.join(rootDir, "spaces");
const distDir = path.join(webDir, "dist");
const passwordsPath = path.join(webDir, "spaces.passwords.local.json");

if (!fs.existsSync(passwordsPath)) {
  console.error(
    `Arquivo de senhas não encontrado: ${passwordsPath}\n` +
      `Crie-o com { "<slug>": "<senha>" } para cada espaço antes de publicar.`,
  );
  process.exit(1);
}
const passwords = JSON.parse(fs.readFileSync(passwordsPath, "utf-8"));

// A lista de slugs vem de spaces/*.excalidraw (mesma fonte de generate-space-pages.mjs),
// não de uma varredura de dist/ — isso evita tratar dist/assets/ como se fosse um espaço.
const slugDirs = fs
  .readdirSync(spacesDir)
  .filter((name) => name.endsWith(".excalidraw"))
  .map((name) => path.basename(name, ".excalidraw"))
  .filter((slug) => fs.existsSync(path.join(distDir, slug, "index.html")));

if (slugDirs.length === 0) {
  console.warn("Nenhuma pasta de espaço encontrada em dist/. Rode generate-space-pages.mjs antes.");
}

const missing = slugDirs.filter((slug) => !passwords[slug]);
if (missing.length > 0) {
  console.error(`Faltando senha para: ${missing.join(", ")}. Adicione em spaces.passwords.local.json.`);
  process.exit(1);
}

// staticrypt recusa senhas curtas com um prompt interativo [y/N]; sem TTY (build
// script/CI) isso trava/aborta em silêncio e o exit code continua 0, deixando a
// página em texto plano sem avisar. Por isso barramos aqui em vez de confiar nele.
const MIN_PASSWORD_LENGTH = 14;
const tooShort = slugDirs.filter((slug) => passwords[slug].length < MIN_PASSWORD_LENGTH);
if (tooShort.length > 0) {
  console.error(
    `Senha curta demais (mínimo ${MIN_PASSWORD_LENGTH} caracteres) para: ${tooShort.join(", ")}.\n` +
      `Use uma senha mais longa em spaces.passwords.local.json.`,
  );
  process.exit(1);
}

const staticryptBin = path.join(
  webDir,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "staticrypt.cmd" : "staticrypt",
);

// Salt único por build, compartilhado entre os espaços desse build (cada um
// já tem senha própria; reaproveitar o salt só evita gerar N valores à toa).
const salt = crypto.randomBytes(16).toString("hex");

for (const slug of slugDirs) {
  const slugDir = path.join(distDir, slug);
  const pageHtmlPath = path.join(slugDir, "index.html");
  console.log(`Criptografando ${slug}...`);

  // Senha vai por env var (STATICRYPT_PASSWORD), não como argv, para não
  // depender de escaping de shell no Windows (.cmd exige shell: true).
  execFileSync(
    staticryptBin,
    ["index.html", "-d", ".", "-s", salt, "-c", "false", "--remember", "7", "--short"],
    { cwd: slugDir, stdio: "inherit", shell: true, env: { ...process.env, STATICRYPT_PASSWORD: passwords[slug] } },
  );

  const encryptedContent = fs.readFileSync(pageHtmlPath, "utf-8");
  if (encryptedContent.includes('id="excalidraw-data"')) {
    console.error(
      `Falha ao criptografar "${slug}": ${pageHtmlPath} ainda contém o JSON em texto plano.`,
    );
    process.exit(1);
  }
}

console.log(`Concluído. ${slugDirs.length} espaço(s) criptografado(s).`);
