import { findImage, type BankEntry } from "./imagebank";
import type { Item } from "./types";

/** associa imagens do banco a itens que ainda não têm imagem escolhida */
export function assignImages(items: Item[], bank: BankEntry[], overwrite = false): Item[] {
  return items.map((it) => {
    let guess = false;
    const images = it.imageQueries.map((q, i) => {
      if (!overwrite && it.images[i]) return it.images[i];
      const m = findImage(bank, q, i === 0 ? it.ean : undefined);
      if (m?.guess) guess = true;
      return m?.entry.src ?? null;
    });
    // "SKOL e ANTARCTICA" sem foto de cada uma: tenta uma foto única com as duas marcas
    if (images.length > 1 && images.every((x) => !x)) {
      const m = findImage(bank, it.name, it.ean);
      if (m) return { ...it, images: [m.entry.src], imageQueries: [it.name], imageGuess: m.guess };
    }
    return { ...it, images, imageGuess: guess };
  });
}
