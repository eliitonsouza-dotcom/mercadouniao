import { toJpeg, toPng } from "html-to-image";
import { PAGE_H, PAGE_W } from "./layout";

const filter = (n: HTMLElement) => !(n.classList && n.classList.contains("no-export"));

/** PNG 1080x1350 do nó da página (o nó pode estar escalado na tela) */
export async function pageToPng(node: HTMLElement, format: "png" | "jpeg" = "png"): Promise<string> {
  await document.fonts.ready;
  const opts = {
    width: PAGE_W,
    height: PAGE_H,
    pixelRatio: 1,
    cacheBust: false,
    filter,
    style: { transform: "none", transformOrigin: "0 0" },
  };
  // a primeira chamada às vezes sai sem imagens/fontes no Safari; a segunda é a boa
  const render = format === "png" ? toPng : (n: HTMLElement, o: typeof opts) => toJpeg(n, { ...o, quality: 0.92, backgroundColor: "#fff" });
  await render(node, opts);
  return render(node, opts);
}

interface ClaudeHost {
  use?: (name: string) => Promise<{ save: (r: { filename: string; data: Blob }) => Promise<unknown> } | null>;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

/** salva o arquivo: pelo visualizador do Claude quando estiver dentro dele, senão download normal */
export async function download(data: string | Blob, filename: string): Promise<void> {
  const host = (globalThis as { claude?: ClaudeHost }).claude;
  if (host?.use) {
    const dl = await host.use("downloads").catch(() => null);
    if (dl) {
      const blob = typeof data === "string" ? await dataUrlToBlob(data) : data;
      try {
        await dl.save({ filename, data: blob });
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code !== "declined") throw new Error((e as { message?: string }).message ?? "Não foi possível salvar o arquivo");
      }
      return;
    }
  }
  const url = typeof data === "string" ? data : URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (typeof data !== "string") setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function pagesToPdf(nodes: HTMLElement[], filename: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "px", format: [PAGE_W, PAGE_H], orientation: "portrait", hotfixes: ["px_scaling"], compress: true });
  for (let i = 0; i < nodes.length; i++) {
    const jpg = await pageToPng(nodes[i], "jpeg");
    if (i > 0) pdf.addPage([PAGE_W, PAGE_H], "portrait");
    pdf.addImage(jpg, "JPEG", 0, 0, PAGE_W, PAGE_H);
  }
  await download(pdf.output("blob"), filename);
}

export function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
