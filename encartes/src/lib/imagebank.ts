import { normalize, stem, words } from "./normalize";

export interface BankEntry {
  /** chave = nome normalizado ("SKOL 300ML") */
  key: string;
  /** url da imagem (pública ou data:) */
  src: string;
  ean?: string;
  /** imagem enviada pelo usuário (IndexedDB) */
  user?: boolean;
}

/** palavras genéricas que sozinhas não identificam o produto */
const GENERIC = new Set(
  [
    "CERVEJA", "RETORNAVEL", "LT", "LATA", "PCT", "PT", "TP", "CX", "FD", "SH", "UN", "KG", "ML", "G", "L",
    "DE", "DA", "DO", "E", "COM", "EM", "PARA", "TRADICIONAL", "INTEGRAL", "PO", "LIQ", "CREMOSO",
    "PLASTICO", "VACUO", "BRANCO", "PRETO", "ZERO",
  ].map(stem),
);

/** "skol-300ml.png" → "SKOL 300ML" */
export function keyFromFilename(file: string): string {
  return normalize(file.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " "));
}

export function keyOf(name: string): string {
  return words(name).join(" ");
}

export interface Match {
  entry: BankEntry;
  /** true = só parte das palavras bateu (conferir) */
  guess: boolean;
  score: number;
}

/**
 * Busca: EAN → nome exato → chave do banco com mais palavras contidas no nome.
 * Chave totalmente contida = confiável; parcial (>= 2 palavras e >= 2/3) = palpite.
 */
export function findImage(bank: BankEntry[], query: string, ean?: string): Match | null {
  if (ean) {
    const e = bank.find((b) => b.ean === ean);
    if (e) return { entry: e, guess: false, score: 1000 };
  }
  const qk = keyOf(query);
  const exact = bank.find((b) => b.key === qk);
  if (exact) return { entry: exact, guess: false, score: 999 };

  const qset = new Set(words(query).map(stem));
  let best: Match | null = null;
  for (const b of bank) {
    const kw = words(b.key).map(stem).filter((w) => !/^\d/.test(w));
    if (!kw.length) continue;
    const matched = kw.filter((w) => qset.has(w));
    const specific = matched.filter((w) => !GENERIC.has(w));
    if (!specific.length) continue;
    const full = matched.length === kw.length;
    const frac = matched.length / kw.length;
    if (!full && !(matched.length >= 2 && frac >= 2 / 3)) continue;
    // contida por inteiro vale mais; depois, mais palavras; depois, menos sobras
    const score = (full ? 100 : 0) + matched.length * 10 + specific.length * 2 - (kw.length - matched.length) * 5;
    // usuário tem prioridade em empate
    const s = score + (b.user ? 0.5 : 0);
    if (!best || s > best.score) best = { entry: b, guess: !full, score: s };
  }
  return best;
}
