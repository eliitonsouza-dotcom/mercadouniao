export type Unit = "UN" | "KG";

export type Section =
  | "BEBIDAS"
  | "HORTIFRUTI"
  | "ACOUGUE"
  | "FRIOS"
  | "CONGELADOS"
  | "MERCEARIA"
  | "LIMPEZA"
  | "HIGIENE"
  | "PET";

export const SECTION_LABEL: Record<Section, string> = {
  BEBIDAS: "Bebidas",
  HORTIFRUTI: "Hortifruti",
  ACOUGUE: "Açougue",
  FRIOS: "Frios/Laticínios",
  CONGELADOS: "Congelados",
  MERCEARIA: "Mercearia",
  LIMPEZA: "Limpeza",
  HIGIENE: "Higiene",
  PET: "Pet",
};

export interface Item {
  id: string;
  /** linha original (sem alterações) */
  raw: string;
  /** nome exibido no card (caixa alta, com acentos originais) */
  name: string;
  /** gramatura / tamanho ("500 ML", "15X269 ML") */
  size: string;
  price: number;
  unit: Unit;
  section: Section;
  /** selo opcional (ex.: "SOMENTE NATURAL") */
  badge?: string;
  /** EAN quando informado na linha */
  ean?: string;
  /** consultas ao banco de imagens (2 quando o nome tem "X e Y") */
  imageQueries: string[];
  /** chaves de imagem escolhidas (uma por consulta); null = placeholder */
  images: (string | null)[];
  /** imagem escolhida por correspondência parcial (conferir) */
  imageGuess?: boolean;
  /** destaque: vai para a coluna lateral */
  highlight?: boolean;
  /** índice do bloco (separado por linhas em branco) na lista original */
  block: number;
  /** confiança do parser 0..1 */
  confidence: number;
}

export type ReviewReason = "sem-preco" | "preco-absurdo" | "duplicado" | "linha-ignorada";

export interface ReviewEntry {
  line: string;
  reason: ReviewReason;
  message: string;
  itemId?: string;
  otherItemId?: string;
}

export interface Validity {
  start?: string; // dd/mm/aaaa
  end?: string; // dd/mm/aaaa
}

export interface ParseResult {
  items: Item[];
  review: ReviewEntry[];
  validity: Validity;
}

export type TemplateId = "G2" | "G4" | "G6" | "L9" | "L12" | "L15";

export interface Page {
  id: string;
  title: string;
  template: TemplateId;
  /** um slot por posição do modelo; slots 0..2 são a coluna lateral nos modelos L */
  slots: (string | null)[];
}

export interface Brand {
  logo: string; // url ou chave "idb:..."
  logoSide: "left" | "right";
  banner: string;
  validityTitle: string;
  validityEnd: string; // dd/mm/aaaa
  addressLines: [string, string];
  phones: [string, string];
  colors: { bg: string; sidebar: string; priceTag: string; panel: string; headerText: string };
  font: "barlow" | "anton" | "system";
}
