import { normalize } from "./normalize";
import type { Section } from "./types";

/**
 * Palavras-chave por seção. A ordem importa: a primeira regra que casar vence.
 * Cada palavra casa no início de palavra; "*" no fim permite prefixo
 * ("DESINF*" casa "DESINFETANTE"), sem "*" exige palavra inteira
 * (para "MACA" não casar "MACARRAO" e "COCA" não casar "COCADA").
 *
 * Obs.: "PET" sozinho NÃO é usado na seção Pet porque aparece em garrafas
 * ("SUCO UVA PANIZZON PET 1,35 LT").
 */
export const RULES: { section: Section; keywords: string[] }[] = [
  {
    section: "MERCEARIA",
    keywords: [
      "BATATA PALHA", "PRINGLES", "FAROFA", "MILHO PIPOCA", "MILHO VERDE", "LEITE COND*",
      "LEITE PO", "LEITE EM PO", "LEITE COCO", "LEITE DE COCO", "CREME DE LEITE", "CR LEITE",
      "GOIABADA", "BOMBOM", "MOLHO*", "EXTRATO", "CATCHUP", "KETCHUP",
    ],
  },
  { section: "PET", keywords: ["RACAO", "RACOES", "AREIA GATO", "AREIA HIGIENICA", "PETISCO*", "PET SHOP"] },
  {
    section: "HIGIENE",
    keywords: [
      "PAPEL HIG*", "CREME DENTAL", "CR DENTAL", "ENXAGUANTE", "SABONETE*", "SHAMPOO", "CONDICIONADOR",
      "CREME DE TRATAMENTO", "CREME TRATAMENTO", "DESODORANTE", "DESD", "ABSORVENTE*", "FRALDA*",
    ],
  },
  {
    section: "LIMPEZA",
    keywords: [
      "SABAO", "DETERGENTE", "DESINF*", "AGUA SANITARIA", "AMACIANTE", "AMAC", "MULTIUSO", "CIF",
      "PAPEL TOALHA", "ESPONJA*", "LA DE ACO", "ALVEJANTE", "AROMATIZANTE", "LIMPA*", "LUSTRA*",
    ],
  },
  {
    section: "CONGELADOS",
    keywords: [
      "TEKITOS", "PAO DE QUEIJO", "PAO DE ALHO", "STEA", "EMPANADO*", "BEMBRASIL", "LASANHA",
      "PIZZA", "NUGGETS", "HAMBURGUER", "SORVETE", "CONG", "CONGELADO*",
    ],
  },
  {
    section: "FRIOS",
    keywords: [
      "IOGURTE", "QUEIJO", "REQUEIJAO", "PRESUNTO", "MORTADELA", "BEBIDA LACTEA", "LEITE FERMENTADO",
      "MARGARINA", "MANTEIGA",
    ],
  },
  {
    section: "ACOUGUE",
    keywords: [
      "BOVINO", "BOVINA", "SUINO", "SUINA", "FRANGO", "PEIXE", "TAMBAQUI", "LINGUICA", "COSTELA",
      "PATINHO", "PICANHA", "ACEM", "CARNE", "BISTECA", "PERNIL", "SALSICHA", "OSSINHO", "ALCATRA",
      "CONTRA FILE", "FIGADO", "COXA", "SOBRECOXA", "FRALDINHA", "MAMINHA", "CUPIM",
    ],
  },
  {
    section: "BEBIDAS",
    keywords: [
      "CERVEJA", "REFRIGERANTE", "REFRI", "GUARANA", "COCA", "COCA COLA", "SUCO", "AGUA MINERAL",
      "CHOPP", "VINHO", "FARDO", "H2OH", "ENERGETICO", "VODKA", "WHISKY", "GIN", "CACHACA", "ISOTONICO",
    ],
  },
  {
    section: "HORTIFRUTI",
    keywords: [
      "BATATA", "ALHO", "CEBOLA", "TOMATE", "REPOLHO", "BETERRABA", "MANDIOCA", "ABACAXI", "LARANJA",
      "MELAO", "BANANA", "MACA", "OVOS", "OVO", "CENOURA", "LIMAO", "MAMAO", "MELANCIA", "CHUCHU",
      "ABOBORA", "ALFACE", "UVA", "MANGA", "PERA", "MORANGO", "PIMENTAO", "COCO VERDE",
    ],
  },
];

/** títulos de seção que aparecem sozinhos numa linha ("FEIRINHA") */
export const SECTION_TITLES: Record<string, Section> = {
  FEIRINHA: "HORTIFRUTI",
  FEIRA: "HORTIFRUTI",
  HORTIFRUTI: "HORTIFRUTI",
  HORTIFRUTTI: "HORTIFRUTI",
  SACOLAO: "HORTIFRUTI",
  BEBIDAS: "BEBIDAS",
  ADEGA: "BEBIDAS",
  MERCEARIA: "MERCEARIA",
  LIMPEZA: "LIMPEZA",
  HIGIENE: "HIGIENE",
  PERFUMARIA: "HIGIENE",
  ACOUGUE: "ACOUGUE",
  CARNES: "ACOUGUE",
  FRIOS: "FRIOS",
  LATICINIOS: "FRIOS",
  CONGELADOS: "CONGELADOS",
  PET: "PET",
  "PET SHOP": "PET",
};

function keywordRegex(k: string): RegExp {
  const prefix = k.endsWith("*");
  const body = (prefix ? k.slice(0, -1) : k).replace(/ /g, "\\s+");
  return new RegExp(`(?:^|[^A-Z0-9])${body}${prefix ? "" : "(?![A-Z0-9])"}`);
}

const COMPILED = RULES.map((r) => ({ section: r.section, res: r.keywords.map(keywordRegex) }));

/** seção pelas palavras-chave; null quando nenhuma casou (cai no padrão Mercearia) */
export function classifyByKeyword(name: string): Section | null {
  const n = normalize(name).replace(/[^A-Z0-9 ]+/g, " ");
  for (const r of COMPILED) if (r.res.some((re) => re.test(n))) return r.section;
  return null;
}

export function classify(name: string): Section {
  return classifyByKeyword(name) ?? "MERCEARIA";
}

export function sectionFromTitle(line: string): Section | null {
  const n = normalize(line).replace(/[^A-Z ]+/g, " ").replace(/\s+/g, " ").trim();
  return SECTION_TITLES[n] ?? null;
}
