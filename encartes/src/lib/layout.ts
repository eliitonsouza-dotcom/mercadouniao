import { uid } from "./normalize";
import type { Item, Page, Section, TemplateId } from "./types";

export const PAGE_W = 1080;
export const PAGE_H = 1350;

/** área de produtos (referência Mercado União) */
export const AREA = { x: 52, y: 405, w: 976, h: 857 };
/** coluna lateral amarela e painel branco nos modelos L */
export const SIDEBAR = { x: 52, w: 240 };
export const PANEL_L = { x: 320, w: 708 };

export interface TemplateDef {
  id: TemplateId;
  capacity: number;
  sidebar: number; // itens na coluna lateral
  cols: number;
  rows: number;
  label: string;
}

export const TEMPLATES: Record<TemplateId, TemplateDef> = {
  G2: { id: "G2", capacity: 2, sidebar: 0, cols: 2, rows: 1, label: "G2 · 2 grandes" },
  G4: { id: "G4", capacity: 4, sidebar: 0, cols: 2, rows: 2, label: "G4 · grade 2x2" },
  G6: { id: "G6", capacity: 6, sidebar: 0, cols: 2, rows: 3, label: "G6 · 2x3 horizontal" },
  L9: { id: "L9", capacity: 9, sidebar: 3, cols: 3, rows: 2, label: "L9 · lateral + 3x2" },
  L12: { id: "L12", capacity: 12, sidebar: 3, cols: 3, rows: 3, label: "L12 · lateral + 3x3" },
  L15: { id: "L15", capacity: 15, sidebar: 3, cols: 4, rows: 3, label: "L15 · lateral + 4x3" },
};

export const TEMPLATE_ORDER: TemplateId[] = ["G2", "G4", "G6", "L9", "L12", "L15"];
export const MAX_PER_PAGE = 15;

export interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
  inSidebar: boolean;
  horizontal: boolean;
}

/** retângulos (coordenadas da página 1080x1350) de cada slot do modelo */
export function cells(t: TemplateId): Cell[] {
  const def = TEMPLATES[t];
  const out: Cell[] = [];
  const pad = 8;
  if (def.sidebar) {
    const h = AREA.h / def.sidebar;
    for (let i = 0; i < def.sidebar; i++) {
      out.push({ x: SIDEBAR.x, y: AREA.y + i * h, w: SIDEBAR.w, h, inSidebar: true, horizontal: false });
    }
  }
  const px = def.sidebar ? PANEL_L.x : AREA.x;
  const pw = def.sidebar ? PANEL_L.w : AREA.w;
  const innerX = px + pad;
  const innerY = AREA.y + pad;
  const cw = (pw - pad * 2) / def.cols;
  const ch = (AREA.h - pad * 2) / def.rows;
  for (let r = 0; r < def.rows; r++) {
    for (let c = 0; c < def.cols; c++) {
      out.push({
        x: innerX + c * cw,
        y: innerY + r * ch,
        w: cw,
        h: ch,
        inSidebar: false,
        horizontal: cw / ch > 1.3,
      });
    }
  }
  return out;
}

/** menor modelo com capacidade >= n */
export function pickTemplate(n: number): TemplateId {
  for (const id of TEMPLATE_ORDER) if (TEMPLATES[id].capacity >= n) return id;
  return "L15";
}

/**
 * Grupos de página: seções que dividem as mesmas páginas.
 * Frios + Congelados e Limpeza + Higiene ficam juntos, como no encarte de referência.
 */
export const PAGE_GROUPS: { id: string; title: string; sections: Section[] }[] = [
  { id: "bebidas", title: "Bebidas", sections: ["BEBIDAS"] },
  { id: "mercearia", title: "Mercearia", sections: ["MERCEARIA"] },
  { id: "limpeza", title: "Limpeza e Higiene", sections: ["LIMPEZA", "HIGIENE"] },
  { id: "frios", title: "Frios e Congelados", sections: ["FRIOS", "CONGELADOS"] },
  { id: "acougue", title: "Açougue", sections: ["ACOUGUE"] },
  { id: "hortifruti", title: "Hortifruti", sections: ["HORTIFRUTI"] },
  { id: "pet", title: "Pet", sections: ["PET"] },
];

/** ordena para a lateral: destaques primeiro, depois a ordem da lista */
function sidebarFirst(items: Item[]): Item[] {
  const hi = items.filter((i) => i.highlight);
  const rest = items.filter((i) => !i.highlight);
  return [...hi, ...rest];
}

/** distribui uma lista de itens (já de uma seção/grupo) em páginas */
export function distributeGroup(items: Item[], title: string): Page[] {
  const n = items.length;
  if (!n) return [];
  const pages = Math.ceil(n / MAX_PER_PAGE);
  const perPage = Math.ceil(n / pages);
  const template = pickTemplate(perPage);
  const cap = TEMPLATES[template].capacity;
  const out: Page[] = [];
  for (let p = 0; p < pages; p++) {
    const chunk = sidebarFirst(items.slice(p * perPage, (p + 1) * perPage));
    const slots: (string | null)[] = Array.from({ length: cap }, (_, i) => chunk[i]?.id ?? null);
    out.push({ id: uid("p"), title: pages > 1 ? `${title} ${p + 1}/${pages}` : title, template, slots });
  }
  return out;
}

export function distribute(items: Item[]): Page[] {
  const pages: Page[] = [];
  for (const g of PAGE_GROUPS) {
    // mantém a ordem da lista, mas agrupa por seção dentro do grupo
    const its = g.sections.flatMap((s) => items.filter((i) => i.section === s));
    pages.push(...distributeGroup(its, g.title));
  }
  return pages;
}

/** troca o modelo de uma página; o que não couber vai para uma página nova logo depois */
export function changeTemplate(pages: Page[], pageId: string, t: TemplateId): Page[] {
  const idx = pages.findIndex((p) => p.id === pageId);
  if (idx < 0) return pages;
  const page = pages[idx];
  const ids = page.slots.filter((s): s is string => !!s);
  const cap = TEMPLATES[t].capacity;
  const keep = ids.slice(0, cap);
  const over = ids.slice(cap);
  const updated: Page = { ...page, template: t, slots: Array.from({ length: cap }, (_, i) => keep[i] ?? null) };
  const result = [...pages];
  result[idx] = updated;
  if (over.length) {
    const tt = pickTemplate(over.length);
    const capO = TEMPLATES[tt].capacity;
    result.splice(idx + 1, 0, {
      id: uid("p"),
      title: `${page.title} (cont.)`,
      template: tt,
      slots: Array.from({ length: capO }, (_, i) => over[i] ?? null),
    });
  }
  return result;
}
