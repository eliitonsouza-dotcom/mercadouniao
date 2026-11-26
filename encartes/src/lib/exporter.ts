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

export function download(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function pagesToPdf(nodes: HTMLElement[], filename: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "px", format: [PAGE_W, PAGE_H], orientation: "portrait", hotfixes: ["px_scaling"], compress: true });
  for (let i = 0; i < nodes.length; i++) {
    const jpg = await pageToPng(nodes[i], "jpeg");
    if (i > 0) pdf.addPage([PAGE_W, PAGE_H], "portrait");
    pdf.addImage(jpg, "JPEG", 0, 0, PAGE_W, PAGE_H);
  }
  pdf.save(filename);
}

export function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
