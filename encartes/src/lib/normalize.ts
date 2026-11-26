/** remove acentos, caixa alta, espaços múltiplos */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** palavras normalizadas, só letras/números */
export function words(s: string): string[] {
  return normalize(s)
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

/** singular simples para comparar (OVOS → OVO, BRANCOS → BRANCO) */
export function stem(w: string): string {
  return w.length > 3 && w.endsWith("S") ? w.slice(0, -1) : w;
}

let counter = 0;
export function uid(prefix = "i"): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
