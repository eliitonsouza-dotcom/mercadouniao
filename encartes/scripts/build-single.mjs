// Gera o sistema inteiro em UM arquivo HTML (JS, CSS, fontes, fotos e marca embutidos).
// Uso: npm run build:single  →  dist-single/encartes.html (abre direto no navegador)
//                              dist-single/encartes-artifact.html (sem <html>/<head>, para publicar como Artifact)
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist-single");
mkdirSync(out, { recursive: true });

// 1. Tailwind
const twCss = join(out, "tw.css");
execSync(`npx tailwindcss -i src/app/globals.css -o ${twCss} --minify`, { cwd: root, stdio: "inherit" });

// 2. JS + CSS das fontes
const res = await build({
  entryPoints: [join(root, "src/standalone.tsx")],
  bundle: true,
  minify: true,
  write: false,
  outdir: out,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  loader: { ".woff2": "dataurl", ".woff": "dataurl" },
  define: { "process.env.NEXT_PUBLIC_BASE_PATH": '""', "process.env.NODE_ENV": '"production"' },
  tsconfig: join(root, "tsconfig.json"),
  logLevel: "warning",
});
const js = res.outputFiles.find((f) => f.path.endsWith(".js")).text;
const fontCss = res.outputFiles.find((f) => f.path.endsWith(".css"))?.text ?? "";
const css = readFileSync(twCss, "utf8") + fontCss;

// 3. imagens públicas → data: URI
const mime = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", svg: "image/svg+xml", webp: "image/webp" };
const assets = {};
for (const dir of ["bank", "brand"]) {
  for (const f of readdirSync(join(root, "public", dir))) {
    const ext = f.split(".").pop().toLowerCase();
    if (!mime[ext]) continue;
    assets[`${dir}/${f}`] = `data:${mime[ext]};base64,${readFileSync(join(root, "public", dir, f)).toString("base64")}`;
  }
}
assets["placeholder.svg"] = `data:image/svg+xml;base64,${readFileSync(join(root, "public/placeholder.svg")).toString("base64")}`;

const safe = (s) => s.replace(/<\/(script|style)/gi, "<\\/$1");
const body = `<title>Encartes Mercado União</title>
<style>:root{color-scheme:light}html,body{background:#f1f2f4;color:#17181a}${safe(css)}</style>
<div id="encartes-root"></div>
<script>window.__ENCARTES_ASSETS__=${JSON.stringify(assets).replace(/</g, "\\u003c")};</script>
<script>${safe(js)}</script>
`;
writeFileSync(join(out, "encartes-artifact.html"), body);
writeFileSync(
  join(out, "encartes.html"),
  `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">${body}</body></html>`,
);
console.log(`dist-single/encartes.html  ${(Buffer.byteLength(body) / 1e6).toFixed(1)} MB`);
