import { describe, expect, it } from "vitest";
import { findImage, keyFromFilename } from "../src/lib/imagebank";
import seed from "../src/lib/seed-bank.json";

const bank = seed as { key: string; src: string }[];

describe("banco de imagens", () => {
  it("nome do arquivo vira chave", () => {
    expect(keyFromFilename("skol 300ml.png")).toBe("SKOL 300ML");
    expect(keyFromFilename("Pão-de-Açúcar_1kg.JPG")).toBe("PAO DE ACUCAR 1KG");
  });

  it.each([
    ["GATORADE ZERO CALORIAS", "GATORADE ZERO"],
    ["GATORADE", "GATORADE"],
    ["CERVEJA IMPERIO ULTRA LN", "IMPERIO ULTRA"],
    ["BATATA MONALISA", "BATATA MONALISA"],
    ["MASSA TAPIOCA LOPES", "TAPIOCA LOPES"],
    ["OVOS BRANCO CTL", "OVOS BRANCOS"],
    ["CERVEJA ORIGINAL RETORNAVEL", "ORIGINAL RETORNAVEL"],
    ["BATATA PRINGLES", "PRINGLES"],
  ])("%s → %s", (q, key) => {
    const m = findImage(bank, q);
    expect(m?.entry.key).toBe(key);
    expect(m?.guess).toBe(false);
  });

  it("não chuta marca errada (café 3 corações ≠ café pilão)", () => {
    expect(findImage(bank, "CAFE 3 CORACOES VACUO")).toBeNull();
  });

  it("EAN tem prioridade", () => {
    const b = [...bank, { key: "XYZ", src: "x.png", ean: "7891234567895" }];
    expect(findImage(b, "QUALQUER", "7891234567895")?.entry.key).toBe("XYZ");
  });
});

describe("associação de imagens aos itens", () => {
  it("'SKOL e ANTARCTICA' sem foto separada usa a foto com as duas marcas", async () => {
    const { parseList } = await import("../src/lib/parser");
    const { assignImages } = await import("../src/lib/match");
    const [it] = assignImages(parseList("CERVEJA SKOL e ANTARCTICA RETORNAVEL 300 ML 2,49").items, bank);
    expect(it.images).toEqual(["bank/brahma-skol-antarctica.jpg"]);
    expect(it.imageGuess).toBe(true);
  });
});
