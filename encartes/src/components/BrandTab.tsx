"use client";

import { useRef } from "react";
import { BANNERS, DEFAULT_BRAND, FONTS } from "@/lib/defaults";
import { distributeGroup } from "@/lib/layout";
import { useStore } from "@/lib/store";
import type { Brand, Item, Page } from "@/lib/types";
import { FlyerPage, ScaledPage } from "./FlyerPage";

function toIso(d: string): string {
  const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}
function fromIso(d: string): string {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

const DEMO_ITEM: Item = {
  id: "demo",
  raw: "",
  name: "PRODUTO EXEMPLO",
  size: "500 G",
  price: 9.99,
  unit: "UN",
  section: "MERCEARIA",
  imageQueries: ["X"],
  images: [null],
  block: 0,
  confidence: 1,
};

export function BrandTab() {
  const { state, dispatch, resolve, setAsset } = useStore();
  const b = state.brand;
  const set = (patch: Partial<Brand>) => dispatch({ type: "brand", patch });
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const preview: { page: Page; items: Record<string, Item> } = state.pages[0]
    ? { page: state.pages[0], items: state.items }
    : { page: distributeGroup(Array.from({ length: 15 }, () => DEMO_ITEM), "Exemplo")[0], items: { demo: DEMO_ITEM } };

  return (
    <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[420px_1fr]">
      <div className="card space-y-4 p-4">
        <h2 className="font-bold">Marca e cabeçalho</h2>

        <div>
          <span className="label">Logo</span>
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolve(b.logo)} alt="" className="h-14 w-24 rounded bg-neutral-900 object-contain p-1" />
            <button className="btn" onClick={() => logoRef.current?.click()}>
              Trocar logo
            </button>
            <div className="ml-auto flex overflow-hidden rounded-md border border-neutral-300 text-sm">
              {(["left", "right"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => set({ logoSide: s })}
                  className={`px-3 py-1.5 ${b.logoSide === s ? "bg-neutral-900 text-white" : "bg-white"}`}
                >
                  {s === "left" ? "Esquerda" : "Direita"}
                </button>
              ))}
            </div>
          </div>
          <input
            ref={logoRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) set({ logo: await setAsset(f) });
              e.target.value = "";
            }}
          />
        </div>

        <div>
          <span className="label">Banner da campanha</span>
          <div className="grid grid-cols-3 gap-2">
            {BANNERS.map((x) => (
              <button
                key={x.id}
                onClick={() => set({ banner: x.src })}
                className={`overflow-hidden rounded border-2 bg-black ${b.banner === x.src ? "border-blue-500" : "border-transparent"}`}
                title={x.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolve(x.src)} alt={x.label} className="aspect-[3/2] w-full object-contain" />
              </button>
            ))}
            {!BANNERS.some((x) => x.src === b.banner) && (
              <div className="overflow-hidden rounded border-2 border-blue-500 bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolve(b.banner)} alt="banner enviado" className="aspect-[3/2] w-full object-contain" />
              </div>
            )}
            <button
              className="rounded border-2 border-dashed border-neutral-300 text-xs text-neutral-500 hover:border-blue-500"
              onClick={() => bannerRef.current?.click()}
            >
              + enviar banner
            </button>
          </div>
          <input
            ref={bannerRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) set({ banner: await setAsset(f) });
              e.target.value = "";
            }}
          />
          <p className="mt-1 text-[11px] text-neutral-500">Área do banner: 560 × 375 px (PNG com fundo transparente fica melhor).</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Título da validade</label>
            <input className="input" value={b.validityTitle} onChange={(e) => set({ validityTitle: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <label className="label">Válido até</label>
            <input className="input" type="date" value={toIso(b.validityEnd)} onChange={(e) => set({ validityEnd: fromIso(e.target.value) })} />
          </div>
        </div>

        <div>
          <label className="label">Endereço (2 linhas)</label>
          {[0, 1].map((i) => (
            <input
              key={i}
              className="input mb-1"
              value={b.addressLines[i]}
              onChange={(e) => {
                const a = [...b.addressLines] as Brand["addressLines"];
                a[i] = e.target.value.toUpperCase();
                set({ addressLines: a });
              }}
            />
          ))}
        </div>
        <div>
          <label className="label">Telefones / WhatsApp</label>
          {[0, 1].map((i) => (
            <input
              key={i}
              className="input mb-1"
              value={b.phones[i]}
              onChange={(e) => {
                const a = [...b.phones] as Brand["phones"];
                a[i] = e.target.value;
                set({ phones: a });
              }}
            />
          ))}
        </div>

        <div>
          <span className="label">Cores</span>
          <div className="grid grid-cols-5 gap-2 text-center text-[11px] text-neutral-500">
            {(
              [
                ["bg", "Fundo"],
                ["panel", "Painel"],
                ["sidebar", "Lateral"],
                ["priceTag", "Preço"],
                ["headerText", "Textos"],
              ] as [keyof Brand["colors"], string][]
            ).map(([k, label]) => (
              <label key={k} className="flex flex-col items-center gap-1">
                <input
                  type="color"
                  value={b.colors[k]}
                  onChange={(e) => set({ colors: { ...b.colors, [k]: e.target.value } })}
                  className="h-9 w-full cursor-pointer rounded border border-neutral-300"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Fonte</label>
          <select className="input" value={b.font} onChange={(e) => set({ font: e.target.value as Brand["font"] })}>
            {Object.entries(FONTS).map(([k, f]) => (
              <option key={k} value={k}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <button className="btn" onClick={() => confirm("Voltar a marca para o padrão?") && set({ ...DEFAULT_BRAND, validityEnd: b.validityEnd })}>
          Restaurar padrão
        </button>
      </div>

      <div className="flex justify-center">
        <div className="sticky top-16 h-fit overflow-hidden rounded shadow-md ring-1 ring-black/10">
          <ScaledPage scale={0.55}>
            <FlyerPage page={preview.page} items={preview.items} brand={b} resolve={resolve} />
          </ScaledPage>
        </div>
      </div>
    </div>
  );
}
