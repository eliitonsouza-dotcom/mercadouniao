/** mede texto com canvas (fonte real) para caber em N linhas */
let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, number>();

export function clearTextCache() {
  cache.clear();
}

function context(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!ctx) ctx = document.createElement("canvas").getContext("2d");
  return ctx;
}

/** quantas linhas o texto ocupa com quebra por palavra */
function countLines(c: CanvasRenderingContext2D, text: string, width: number): number {
  const ws = text.split(/\s+/).filter(Boolean);
  let lines = 1;
  let cur = "";
  for (const w of ws) {
    const next = cur ? `${cur} ${w}` : w;
    if (c.measureText(next).width <= width || !cur) {
      if (!cur && c.measureText(w).width > width) return Infinity; // palavra maior que a linha
      cur = next;
    } else {
      lines++;
      cur = w;
    }
  }
  return lines;
}

/** maior tamanho de fonte (<= max) que cabe em `lines` linhas */
export function fitText(text: string, family: string, weight: number, width: number, lines: number, max: number, min = 9): number {
  const key = `${text}|${family}|${weight}|${Math.round(width)}|${lines}|${Math.round(max)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = context();
  let result: number;
  if (!c) {
    const chars = Math.max(text.length, 6);
    result = Math.max(min, Math.min(max, (lines * 0.9 * width) / (0.5 * chars)));
  } else {
    let lo = min;
    let hi = max;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      c.font = `${weight} ${mid}px ${family}`;
      if (countLines(c, text, width) <= lines) lo = mid;
      else hi = mid;
    }
    result = lo;
  }
  cache.set(key, result);
  return result;
}

/** escolhe 2 ou 3 linhas: 3 só quando o nome é longo e ficaria pequeno demais */
export function fitName(text: string, family: string, width: number, max: number): { fs: number; lines: number } {
  const f2 = fitText(text, family, 800, width, 2, max);
  if (f2 >= max * 0.62) return { fs: f2, lines: 2 };
  const f3 = fitText(text, family, 800, width, 3, max * 0.66);
  return f3 > f2 ? { fs: f3, lines: 3 } : { fs: f2, lines: 2 };
}
