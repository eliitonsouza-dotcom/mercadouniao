import type { Brand } from "./types";

export const BANNERS: { id: string; label: string; src: string }[] = [
  { id: "black-friday", label: "Black Friday", src: "brand/banner-black-friday.png" },
  { id: "agosto", label: "Ofertas de Agosto", src: "brand/banner-agosto.jpg" },
  { id: "fim-de-semana", label: "Fim de Semana", src: "brand/banner-fim-de-semana.png" },
  { id: "aniversario", label: "Aniversário", src: "brand/banner-aniversario.png" },
];

export const DEFAULT_BRAND: Brand = {
  logo: "brand/logo-uniao.png",
  logoSide: "left",
  banner: "brand/banner-black-friday.png",
  validityTitle: "PROMOÇÃO VÁLIDA",
  validityEnd: "",
  addressLines: ["AV. BRASIL, ENTRE T-22 E T-23", "NOVA BRASÍLIA · JI-PARANÁ/RO"],
  phones: ["(69) 98461-3939", "(69) 3424-1784"],
  colors: { bg: "#000000", sidebar: "#FFD200", priceTag: "#B80000", panel: "#FFFFFF", headerText: "#FFFFFF" },
  font: "barlow",
};

export const FONTS: Record<Brand["font"], { label: string; name: string; price: string }> = {
  barlow: {
    label: "Barlow Condensed (padrão)",
    name: "'Barlow Condensed', 'Arial Narrow', sans-serif",
    price: "'Anton', 'Barlow Condensed', Impact, sans-serif",
  },
  anton: { label: "Anton", name: "'Anton', Impact, sans-serif", price: "'Anton', Impact, sans-serif" },
  system: {
    label: "Arial Narrow (sistema)",
    name: "'Arial Narrow', Arial, sans-serif",
    price: "Impact, 'Arial Black', sans-serif",
  },
};
