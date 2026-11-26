/** Tudo roda no navegador; `output: "export"` gera site estático (dá para publicar no GitHub Pages). */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
export default {
  output: "export",
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
};
