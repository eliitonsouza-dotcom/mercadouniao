# Encartes · Mercado União (MVP)

Cola a lista de ofertas do mercado → o sistema interpreta, classifica, associa as fotos e monta as páginas de encarte
(1080×1350, feed do Instagram). Dá para editar tudo e baixar em PNG ou PDF.

```bash
cd encartes
npm install
npm run dev        # http://localhost:3000
npm test           # parser, classificação, distribuição e banco de imagens (lista real em tests/fixtures)
npm run build      # gera site estático em out/ (NEXT_PUBLIC_BASE_PATH=/encartes para publicar numa subpasta)
```

## Como funciona

| Etapa | Arquivo |
|---|---|
| Parser (nome, tamanho, preço, UN/KG, selo, validade, revisão) | `src/lib/parser.ts` |
| Classificação por palavras-chave + bloco da lista | `src/lib/classify.ts` |
| Modelos G2/G4/G6/L9/L12/L15 e auto-distribuição | `src/lib/layout.ts` |
| Banco de imagens (EAN → nome exato → mais palavras contidas) | `src/lib/imagebank.ts`, `src/lib/match.ts` |
| Página 1080×1350 (cabeçalho, painel, cards, etiqueta de preço, rodapé) | `src/components/FlyerPage.tsx` |
| Editor (clique para editar, arrastar entre posições/páginas, trocar modelo) | `src/components/EditorTab.tsx`, `ItemPanel.tsx` |
| Exportação PNG/PDF (no navegador, html-to-image + jsPDF) | `src/lib/exporter.ts` |
| Marca (logo e posição, banner, validade, endereço, telefones, cores, fonte) | `src/components/BrandTab.tsx` |

Decisões do MVP:

- **Tudo roda no navegador**, sem servidor nem login. Projeto salvo no `localStorage`; fotos enviadas e logo/banner no IndexedDB.
  O próximo passo é trocar por Supabase (Postgres + Storage) quando entrar multi-mercado.
- **Banco inicial** = as 127 fotos de `../img/produtos` (copiadas para `public/bank` por `npm run seed-bank`).
- **Grupos de página:** Frios + Congelados e Limpeza + Higiene dividem páginas (como no encarte de referência);
  a seção de cada item continua separada.
- **"PET" sozinho não indica a seção Pet** (aparece em garrafa: "SUCO UVA PANIZZON PET"). Pet = ração, areia gato, petisco.
- **"MOLHO" e "EXTRATO" entram nas exceções de Mercearia** (senão "MOLHO DE TOMATE" ia para Hortifruti).
- Foto escolhida por semelhança parcial aparece com um **"?" laranja** no editor (não sai na exportação) para conferir.
- Logo e banner "Black Friday" atuais são provisórios (logo recortada do banner do site; banners em
  `scripts/render-banners.cjs`). Troque pelos arquivos originais na aba **Marca**.

## Próximos passos

- Parser com a API do Claude para listas muito bagunçadas (regex continua como plano B).
- Remoção automática de fundo no upload (`@imgly/background-removal`).
- Supabase: mercados, produtos, encartes, páginas e Storage; login; multi-mercado.
- Mais variações de fonte/cores por campanha.
