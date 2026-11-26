// Copia ../img/produtos para public/bank e gera src/lib/seed-bank.json
import { readdirSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "..", "img", "produtos");
const dst = join(root, "public", "bank");
mkdirSync(dst, { recursive: true });
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
const entries = [];
for (const f of readdirSync(src).sort()) {
  if (!/\.(png|jpe?g|webp)$/i.test(f)) continue;
  copyFileSync(join(src, f), join(dst, f));
  entries.push({ key: norm(f.replace(/\.[^.]+$/, "")), src: `bank/${f}` });
}
writeFileSync(join(root, "src", "lib", "seed-bank.json"), JSON.stringify(entries, null, 1));
console.log(`${entries.length} imagens no banco inicial`);
