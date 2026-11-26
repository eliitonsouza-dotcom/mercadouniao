import { classifyByKeyword, sectionFromTitle } from "./classify";
import { normalize, uid, words } from "./normalize";
import type { Item, ParseResult, ReviewEntry, Section, Unit, Validity } from "./types";

export interface ParseOptions {
  /** data de referência para completar o ano da validade (padrão: hoje) */
  today?: Date;
}

/** número com 2 casas decimais (preço ou tamanho tipo "1,35 LT") */
const MONEY_RE = /(?:R\$\s*)?(?<![\d.,])(\d{1,4}(?:\.\d{3})*[.,]\d{2})(?![\d])/g;

/** unidades de tamanho; "KG" fica de fora porque "5,79 KG" é preço por kg */
const SIZE_UNIT_AFTER = /^\s*(ML|LTS?|L|G|GR|GRS|M|MT|MTS|FL|FLS|CM|MG|UN|UND|UNID)(?![A-Z0-9])/i;

const SIZE_RE =
  /(?<![A-Za-zÀ-ú0-9])(?:\d+\s?[xX]\s?)?\d+(?:[.,]\d+)?\s?(?:ML|LTS?|L|G|GR|GRS|KGS?|M|MT|MTS|UN|UND|UNID|FL|FLS|CM|MG|CAPS|METROS?)(?![A-Za-zÀ-ú0-9])/gi;

const STOPWORDS = new Set(["DE", "DA", "DO", "DAS", "DOS", "EM", "COM", "E", "SH", "C"]);

interface MoneyHit {
  value: number;
  index: number;
  end: number;
  text: string;
}

function toNumber(s: string): number {
  // "1.299,90" → 1299.90 ; "5.99" → 5.99 ; "5,99" → 5.99
  const t = s.replace(/\s/g, "");
  if (/^\d{1,4}(\.\d{3})+,\d{2}$/.test(t)) return Number(t.replace(/\./g, "").replace(",", "."));
  return Number(t.replace(",", "."));
}

function moneyHits(line: string): MoneyHit[] {
  const out: MoneyHit[] = [];
  for (const m of line.matchAll(MONEY_RE)) {
    out.push({ value: toNumber(m[1]), index: m.index!, end: m.index! + m[0].length, text: m[0] });
  }
  return out;
}

/** último número de 2 casas que não é tamanho ("1,35 LT" é tamanho) */
function findPrice(line: string): MoneyHit | null {
  const hits = moneyHits(line);
  for (let i = hits.length - 1; i >= 0; i--) {
    const after = line.slice(hits[i].end);
    if (SIZE_UNIT_AFTER.test(after)) continue;
    return hits[i];
  }
  return null;
}

function hasLetters(s: string): boolean {
  return /[A-Za-zÀ-ú]{2,}/.test(s);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtDate(d: number, m: number, y: number): string {
  return `${pad(d)}/${pad(m)}/${y}`;
}

/** "PROMOCOES VALIDA DE 20/11 ATE 23/11" → { start: 20/11/aaaa, end: 23/11/aaaa } */
export function parseValidity(line: string, today = new Date()): Validity | null {
  const n = normalize(line);
  if (!/(VALID|PROMO|OFERTA|ATE|ENCARTE)/.test(n)) return null;
  const dates = [...n.matchAll(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g)].map((m) => {
    let y = m[3] ? Number(m[3]) : undefined;
    if (y !== undefined && y < 100) y += 2000;
    return { d: Number(m[1]), m: Number(m[2]), y };
  });
  if (!dates.length) return null;
  const year = today.getFullYear();
  const v: Validity = {};
  if (dates.length >= 2) {
    const [a, b] = dates;
    const ya = a.y ?? year;
    let yb = b.y ?? ya;
    if (!b.y && (b.m < a.m || (b.m === a.m && b.d < a.d))) yb = ya + 1;
    v.start = fmtDate(a.d, a.m, ya);
    v.end = fmtDate(b.d, b.m, yb);
  } else {
    const [a] = dates;
    v.end = fmtDate(a.d, a.m, a.y ?? year);
  }
  return v;
}

const GREETING_RE = /^(BOM DIA|BOA TARDE|BOA NOITE|OLA|OI|SEGUE|SEGUEM|BOAS)\b/;

/** divide uma linha por ";", "|", tab ou " - " quando cada parte tem preço */
function splitSegments(line: string): string[] {
  for (const sep of [/\s*[;|\t]\s*|\s+-\s+/, /\s*[;|\t]\s*/]) {
    const parts = line.split(sep).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1 && parts.every((p) => findPrice(p) && hasLetters(p))) return parts;
  }
  return [line];
}

interface Parsed {
  name: string;
  size: string;
  price: number;
  unit: Unit;
  badge?: string;
  ean?: string;
  imageQueries: string[];
}

function isNumericToken(t: string): boolean {
  return /^\d+([.,]\d+)?$/.test(t) || /^\d+[xX]\d+([.,]\d+)?$/.test(t);
}

/** interpreta "nome + tamanho" (antes do preço) e "cauda" (depois do preço) */
function parseParts(headRaw: string, tailRaw: string, price: number): Parsed {
  let unit: Unit = "UN";
  let badge: string | undefined;

  // ---- cauda: unidade e selo
  let tail = tailRaw.trim().replace(/^[-–:,.]+\s*/, "");
  const tailUnit = tail.match(/^\/?\s*(KG|KILO|QUILO|UN|UND|UNID|CADA|CX|PCT|FD)\b\.?\s*/i);
  if (tailUnit) {
    if (/^(KG|KILO|QUILO)$/i.test(tailUnit[1])) unit = "KG";
    tail = tail.slice(tailUnit[0].length);
  }
  tail = tail.replace(/^[-–:,.()\s]+|[-–:,.\s]+$/g, "");
  if (hasLetters(tail)) badge = tail.toLocaleUpperCase("pt-BR");

  // ---- cabeça: limpa "R$", "DE x POR", "/KG"
  let head = headRaw
    .replace(/R\$\s*$/i, "")
    .replace(/\s+(DE\s+)?R?\$?\s*\d{1,4}[.,]\d{2}\s+POR\s*$/i, "")
    .replace(/\s+POR\s*$/i, "")
    .replace(/[-–:]+\s*$/, "")
    .trim();

  if (/\/\s*KG\b/i.test(head) || /\bR\$\s*\/?\s*KG\b/i.test(head)) {
    unit = "KG";
    head = head.replace(/\s*(R\$\s*)?\/\s*KG\b/gi, " ");
  }

  // EAN (8 a 14 dígitos soltos)
  let ean: string | undefined;
  const eanM = head.match(/(?<![\d,.])\d{8,14}(?![\d,.]|\s?(ML|G|KG|L|LT|UN)\b)/i);
  if (eanM) {
    ean = eanM[0];
    head = head.replace(eanM[0], " ");
  }

  // "KG" / "UN" sem número antes = unidade de venda
  const toks = head.split(/\s+/).filter(Boolean);
  const kept: string[] = [];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i].toUpperCase();
    const prevNumeric = i > 0 && isNumericToken(toks[i - 1]);
    if ((t === "KG" || t === "KG." || t === "/KG") && !prevNumeric) {
      unit = "KG";
      continue;
    }
    if ((t === "UN" || t === "UND" || t === "UNID") && !prevNumeric && i === toks.length - 1) {
      unit = "UN";
      continue;
    }
    kept.push(toks[i]);
  }
  head = kept.join(" ");

  // tamanhos
  const sizes: string[] = [];
  head = head.replace(SIZE_RE, (m) => {
    sizes.push(m.toUpperCase().replace(/\s?X\s?/g, "X"));
    return " ";
  });
  const size = sizes.join(" ").replace(/\s+/g, " ").trim();

  const nameOrig = head.replace(/\s+/g, " ").replace(/\s+([,)])/g, "$1").trim();
  const name = nameOrig.toLocaleUpperCase("pt-BR");

  // "SKOL e ANTARCTICA": um card com 2 imagens
  let imageQueries = [name];
  const eSplit = nameOrig.match(/^(.*?\S)\s+e\s+(\S.*)$/);
  if (eSplit) {
    const left = eSplit[1].split(/\s+/);
    const right = eSplit[2].split(/\s+/);
    const prefix = left.slice(0, -1);
    const a = [...left, ...right.slice(1)].join(" ");
    const b = [...prefix, ...right].join(" ");
    imageQueries = [a.toLocaleUpperCase("pt-BR"), b.toLocaleUpperCase("pt-BR")];
  }

  void price;
  return { name, size, price, unit, badge, ean, imageQueries };
}

function dupKey(it: Item): Set<string> {
  return new Set(words(it.name).filter((w) => !STOPWORDS.has(w)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

export function parseList(text: string, opts: ParseOptions = {}): ParseResult {
  const today = opts.today ?? new Date();
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const items: Item[] = [];
  const review: ReviewEntry[] = [];
  let validity: Validity = {};

  let block = 0;
  let blockHasContent = false;
  const blockTitle = new Map<number, Section>();
  let pendingName: string | null = null;

  const pushItem = (raw: string, p: Parsed, confidence: number) => {
    const it: Item = {
      id: uid(),
      raw,
      name: p.name,
      size: p.size,
      price: p.price,
      unit: p.unit,
      section: "MERCEARIA",
      badge: p.badge,
      ean: p.ean,
      imageQueries: p.imageQueries,
      images: p.imageQueries.map(() => null),
      block,
      confidence,
    };
    items.push(it);
    blockHasContent = true;
    if (p.price <= 0.09 || p.price > 2000) {
      review.push({ line: raw, reason: "preco-absurdo", message: `Preço R$ ${p.price.toFixed(2)} parece errado`, itemId: it.id });
    }
  };

  const flushPending = () => {
    if (pendingName) {
      review.push({ line: pendingName, reason: "sem-preco", message: "Linha sem preço" });
      pendingName = null;
    }
  };

  for (let li = 0; li < lines.length; li++) {
    const rawLine = lines[li].trim();
    if (!rawLine) {
      flushPending();
      if (blockHasContent) {
        block++;
        blockHasContent = false;
      }
      continue;
    }

    // validade / saudação
    const price0 = findPrice(rawLine);
    if (!price0) {
      const v = parseValidity(rawLine, today);
      if (v) {
        validity = { ...validity, ...v };
        continue;
      }
      if (GREETING_RE.test(normalize(rawLine))) continue;
      const title = sectionFromTitle(rawLine);
      if (title) {
        flushPending();
        if (blockHasContent) {
          block++;
          blockHasContent = false;
        }
        blockTitle.set(block, title);
        continue;
      }
    }

    for (const seg of splitSegments(rawLine)) {
      const price = findPrice(seg);
      if (!price) {
        flushPending();
        pendingName = seg;
        continue;
      }
      const head = seg.slice(0, price.index);
      const tail = seg.slice(price.end);
      if (!hasLetters(head) && pendingName) {
        // linha só com preço: o nome veio na linha anterior
        const p = parseParts(pendingName, tail, price.value);
        p.price = price.value;
        pushItem(`${pendingName} ${seg}`, p, 0.7);
        pendingName = null;
        continue;
      }
      flushPending();
      if (!hasLetters(head)) {
        review.push({ line: seg, reason: "linha-ignorada", message: "Preço sem nome de produto" });
        continue;
      }
      const p = parseParts(head, tail, price.value);
      p.price = price.value;
      pushItem(seg, p, p.name.length >= 3 ? 1 : 0.5);
    }
  }
  flushPending();

  // ---- seções: bloco como sinal forte, palavras-chave confirmam / subdividem
  const byBlock = new Map<number, Item[]>();
  for (const it of items) {
    if (!byBlock.has(it.block)) byBlock.set(it.block, []);
    byBlock.get(it.block)!.push(it);
  }
  for (const [b, its] of byBlock) {
    const kw = its.map((it) => classifyByKeyword(it.name));
    const counts = new Map<Section, number>();
    for (const s of kw) if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
    let majority: Section | null = null;
    let best = 0;
    for (const [s, c] of counts) if (c > best) [majority, best] = [s, c];
    const hint = blockTitle.get(b) ?? majority ?? "MERCEARIA";
    its.forEach((it, i) => {
      it.section = kw[i] ?? hint;
      if (!kw[i]) it.confidence = Math.min(it.confidence, 0.8);
    });
  }

  // ---- duplicados (grafias diferentes do mesmo produto)
  const keys = items.map(dupKey);
  const sizeKey = (s: string) => normalize(s).replace(/\s/g, "");
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < i; j++) {
      if (sizeKey(items[i].size) !== sizeKey(items[j].size)) continue;
      if (jaccard(keys[i], keys[j]) >= 0.75) {
        review.push({
          line: items[i].raw,
          reason: "duplicado",
          message: `Parece repetido de "${items[j].raw.trim()}"`,
          itemId: items[i].id,
          otherItemId: items[j].id,
        });
        break;
      }
    }
  }

  return { items, review, validity };
}
