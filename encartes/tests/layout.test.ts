import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cells, changeTemplate, distribute, pickTemplate, TEMPLATES } from "../src/lib/layout";
import { parseList } from "../src/lib/parser";

const r = parseList(readFileSync(join(__dirname, "fixtures", "lista-real.txt"), "utf8"));

describe("auto-distribuição", () => {
  it("menor modelo com capacidade suficiente", () => {
    expect([1, 2, 3, 5, 7, 9, 10, 13, 15, 20].map(pickTemplate)).toEqual([
      "G2", "G2", "G4", "G6", "L9", "L9", "L12", "L15", "L15", "L15",
    ]);
  });

  it("páginas da lista real", () => {
    const pages = distribute(r.items);
    expect(pages.map((p) => `${p.title}:${p.template}:${p.slots.filter(Boolean).length}`)).toEqual([
      "Bebidas:L15:15",
      "Mercearia 1/3:L12:12",
      "Mercearia 2/3:L12:12",
      "Mercearia 3/3:L12:12",
      "Limpeza e Higiene 1/2:L15:13",
      "Limpeza e Higiene 2/2:L15:12",
      "Frios e Congelados:L9:9",
      "Açougue:L9:8",
      "Hortifruti:L9:9",
      "Pet:G2:2",
    ]);
    // todo item aparece exatamente uma vez
    const ids = pages.flatMap((p) => p.slots.filter(Boolean));
    expect(new Set(ids).size).toBe(r.items.length);
  });

  it("destaques vão para a lateral", () => {
    const items = r.items.filter((i) => i.section === "HORTIFRUTI").map((i) => ({ ...i }));
    items[8].highlight = true;
    const [page] = distribute(items);
    expect(page.slots[0]).toBe(items[8].id);
  });

  it("geometria: número de células = capacidade; G6 horizontal", () => {
    for (const t of Object.values(TEMPLATES)) expect(cells(t.id)).toHaveLength(t.capacity);
    expect(cells("G6").every((c) => c.horizontal)).toBe(true);
    expect(cells("L15").slice(0, 3).every((c) => c.inSidebar)).toBe(true);
  });

  it("trocar para modelo menor joga o excedente para uma página nova", () => {
    const pages = distribute(r.items);
    const out = changeTemplate(pages, pages[0].id, "G6");
    expect(out).toHaveLength(pages.length + 1);
    expect(out[0].slots.filter(Boolean)).toHaveLength(6);
    expect(out[1].slots.filter(Boolean)).toHaveLength(9);
  });
});
