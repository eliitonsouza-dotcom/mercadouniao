import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classify } from "../src/lib/classify";
import { parseList } from "../src/lib/parser";

const LISTA = readFileSync(join(__dirname, "fixtures", "lista-real.txt"), "utf8");
const TODAY = new Date(2026, 10, 26);
const r = parseList(LISTA, { today: TODAY });
const by = (name: string) => {
  const it = r.items.find((i) => i.name === name);
  if (!it) throw new Error(`item não encontrado: ${name}`);
  return it;
};

describe("lista real do Mercado União", () => {
  it("lê todos os 104 produtos", () => {
    expect(r.items).toHaveLength(104);
  });

  it("extrai a validade e completa o ano", () => {
    expect(r.validity).toEqual({ start: "20/11/2026", end: "23/11/2026" });
  });

  it("preço é o último número com 2 casas; 1,35 LT / 2,2 KG são tamanho", () => {
    expect(by("SUCO UVA PANIZZON PET")).toMatchObject({ price: 11.99, size: "1,35 LT", section: "BEBIDAS" });
    expect(by("SABAO PO OMO")).toMatchObject({ price: 29.99, size: "2,2 KG", unit: "UN" });
    expect(by("IOGURTE NESTLE ZERO")).toMatchObject({ price: 15.99, size: "1,15 LT" });
    expect(by("CERVEJA ORIGINAL MULTPACK")).toMatchObject({ price: 52.35, size: "15X269 ML" });
    expect(by("TANQUERAY")).toMatchObject({ price: 119.99, size: "750 ML" });
  });

  it("KG sem número antes = preço por KG; '15 KG' = tamanho", () => {
    expect(by("PATINHO BOVINO")).toMatchObject({ unit: "KG", price: 43.99, size: "" });
    expect(by("BATATA MONALISA")).toMatchObject({ unit: "KG", section: "HORTIFRUTI" });
    expect(by("SALSICHA HOT DOG GUIBON")).toMatchObject({ unit: "KG", section: "ACOUGUE" });
    expect(by("RACAO SMACK")).toMatchObject({ unit: "UN", size: "15 KG", section: "PET", price: 109.99 });
    expect(by("ARROZ SOMAR PCT")).toMatchObject({ unit: "UN", size: "5 KG" });
    expect(by("ABACAXI")).toMatchObject({ unit: "UN", price: 5.99 });
    expect(by("OVOS BRANCO CTL")).toMatchObject({ unit: "UN", size: "30 UN", section: "HORTIFRUTI" });
  });

  it("texto depois do preço vira selo", () => {
    expect(by("CERVEJA ORIGINAL RETORNAVEL").badge).toBe("SOMENTE NATURAL");
    expect(by("CAMPARI").badge).toBeUndefined();
  });

  it("'SKOL e ANTARCTICA' vira um card com 2 imagens", () => {
    const it = by("CERVEJA SKOL E ANTARCTICA RETORNAVEL");
    expect(it.imageQueries).toEqual(["CERVEJA SKOL RETORNAVEL", "CERVEJA ANTARCTICA RETORNAVEL"]);
    expect(it.images).toHaveLength(2);
  });

  it("'E' maiúsculo em sabores não divide o card", () => {
    expect(by("AGUA MINERAL LINDAGUA COM GAS TRADICIONAL, TANGERINA E COM LIMÃO").imageQueries).toHaveLength(1);
  });

  it("duplicado com grafia diferente vai para revisão", () => {
    const dups = r.review.filter((x) => x.reason === "duplicado");
    expect(dups).toHaveLength(1);
    expect(dups[0].line).toContain("SABÃO EM PÓ BRILHANTE");
  });

  it("contagem por seção (bloco + palavras-chave)", () => {
    const count: Record<string, number> = {};
    for (const i of r.items) count[i.section] = (count[i.section] ?? 0) + 1;
    expect(count).toEqual({
      BEBIDAS: 15,
      MERCEARIA: 36,
      HIGIENE: 7,
      LIMPEZA: 18,
      FRIOS: 4,
      CONGELADOS: 5,
      ACOUGUE: 8,
      HORTIFRUTI: 9,
      PET: 2,
    });
  });

  it("itens sem palavra-chave herdam a seção do bloco", () => {
    expect(by("CAMPARI").section).toBe("BEBIDAS");
    expect(by("ICE CABARE").section).toBe("BEBIDAS");
    expect(by("MARMITEX ISOPOR FOODPACK").section).toBe("LIMPEZA");
    expect(by("MOLHO DE TOMATE CALIFRUIT").section).toBe("MERCEARIA");
    expect(by("BATATA BEMBRASIL").section).toBe("CONGELADOS");
    expect(by("PAO DE QUEIJO TOP QUEIJO CONG").section).toBe("CONGELADOS");
    expect(by("MANDIOCA CONGELADA").section).toBe("HORTIFRUTI");
  });
});

describe("regras gerais do parser", () => {
  it("de X por Y usa o último preço", () => {
    const [it] = parseList("CAFE PILAO 500 G DE 19,99 POR 15,99").items;
    expect(it).toMatchObject({ name: "CAFE PILAO", price: 15.99, size: "500 G" });
  });

  it("R$ e /KG", () => {
    const [it] = parseList("PICANHA R$ 69,90/KG").items;
    expect(it).toMatchObject({ name: "PICANHA", price: 69.9, unit: "KG" });
    const [b] = parseList("TOMATE 5,79 KG").items;
    expect(b).toMatchObject({ name: "TOMATE", unit: "KG", price: 5.79 });
  });

  it("nome numa linha e preço na seguinte", () => {
    const res = parseList("BANANA NANICA KG\n4,99");
    expect(res.items).toHaveLength(1);
    expect(res.items[0]).toMatchObject({ name: "BANANA NANICA", price: 4.99, unit: "KG" });
    expect(res.review).toHaveLength(0);
  });

  it("separadores ; | tab e ' - '", () => {
    expect(parseList("ARROZ 5 KG 21,99; FEIJAO 1 KG 5,99 | CAFE 500 G 15,99").items).toHaveLength(3);
    expect(parseList("ARROZ 5 KG 21,99\tFEIJAO 1 KG 5,99").items).toHaveLength(2);
    expect(parseList("ARROZ 5 KG 21,99 - FEIJAO 1 KG 5,99").items).toHaveLength(2);
  });

  it("linha sem preço e preço absurdo vão para revisão", () => {
    const res = parseList("PRODUTO SEM PRECO\n\nARROZ 5 KG 9999,99");
    expect(res.review.map((x) => x.reason).sort()).toEqual(["preco-absurdo", "sem-preco"]);
  });

  it("título de seção ('FEIRINHA') vale para o bloco", () => {
    const res = parseList("FEIRINHA\nPEPINO KG 3,99\nCOUVE UN 2,99");
    expect(res.items.map((i) => i.section)).toEqual(["HORTIFRUTI", "HORTIFRUTI"]);
  });

  it("validade com ano e virada de ano", () => {
    expect(parseList("OFERTAS VALIDAS DE 28/12 ATE 03/01", { today: TODAY }).validity).toEqual({
      start: "28/12/2026",
      end: "03/01/2027",
    });
  });
});

describe("classificação por palavras-chave", () => {
  it.each([
    ["BATATA PALHA YOKI", "MERCEARIA"],
    ["LEITE COND MOCOCA", "MERCEARIA"],
    ["SUCO DEL VALLE PET 1 LT", "BEBIDAS"],
    ["DESINFETANTE PINHO", "LIMPEZA"],
    ["AGUA SANITARIA", "LIMPEZA"],
    ["AGUA MINERAL", "BEBIDAS"],
    ["MACARRAO RENATA", "MERCEARIA"],
    ["MACA GALA", "HORTIFRUTI"],
    ["COCADA", "MERCEARIA"],
    ["PAO DE ALHO", "CONGELADOS"],
    ["BEBIDA LACTEA", "FRIOS"],
    ["RACAO PEDIGREE", "PET"],
  ])("%s → %s", (name, section) => {
    expect(classify(name)).toBe(section);
  });
});
