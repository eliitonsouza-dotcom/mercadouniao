"use client";

import { useState } from "react";
import { keyOf } from "@/lib/imagebank";
import { TEMPLATES } from "@/lib/layout";
import { useStore, type Slot } from "@/lib/store";
import { SECTION_LABEL, type Item, type Section } from "@/lib/types";
import { ImagePicker } from "./ImagePicker";

const SECTIONS = Object.keys(SECTION_LABEL) as Section[];

export function ItemPanel({ itemId, slot, onDone }: { itemId: string; slot: Slot | null; onDone: () => void }) {
  const { state, dispatch, resolve } = useStore();
  const it = state.items[itemId];
  const [picker, setPicker] = useState<number | null>(null);
  if (!it) return null;
  const upd = (patch: Partial<Item>) => dispatch({ type: "updateItem", id: it.id, patch });
  const page = slot ? state.pages.find((p) => p.id === slot.pageId) : undefined;

  const moveWithin = (d: -1 | 1) => {
    if (!slot || !page) return;
    const j = slot.index + d;
    if (j < 0 || j >= page.slots.length) return;
    dispatch({ type: "swap", from: slot, to: { pageId: page.id, index: j } });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold leading-tight">{it.name || "(sem nome)"}</h3>
        <button className="text-neutral-400 hover:text-neutral-800" onClick={onDone} title="Fechar">
          ✕
        </button>
      </div>
      <p className="break-words rounded bg-neutral-50 px-2 py-1 font-mono text-[11px] text-neutral-500">{it.raw}</p>

      <div>
        <span className="label">Imagem{it.images.length > 1 ? "s" : ""}</span>
        <div className="flex flex-wrap gap-2">
          {it.images.map((src, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <button
                onClick={() => setPicker(picker === i ? null : i)}
                className={`h-20 w-20 overflow-hidden rounded border bg-white ${picker === i ? "border-blue-500 ring-2 ring-blue-200" : "border-neutral-300"}`}
                title="Trocar imagem"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolve(src)} alt="" className="h-full w-full object-contain" />
              </button>
              {it.images.length > 1 && (
                <button
                  className="text-[11px] text-neutral-500 hover:text-red-600"
                  onClick={() =>
                    upd({
                      images: it.images.filter((_, k) => k !== i),
                      imageQueries: it.imageQueries.filter((_, k) => k !== i),
                    })
                  }
                >
                  remover
                </button>
              )}
            </div>
          ))}
          {it.images.length < 3 && (
            <button
              className="h-20 w-20 rounded border-2 border-dashed border-neutral-300 text-xs text-neutral-500 hover:border-blue-500"
              onClick={() => {
                upd({ images: [...it.images, null], imageQueries: [...it.imageQueries, it.name] });
                setPicker(it.images.length);
              }}
            >
              + imagem
            </button>
          )}
        </div>
        {it.imageGuess && (
          <p className="mt-1 flex items-center gap-2 text-xs text-orange-700">
            Imagem escolhida por semelhança. Confira.
            <button className="underline" onClick={() => upd({ imageGuess: false })}>
              está certa
            </button>
          </p>
        )}
        {picker !== null && (
          <ImagePicker
            initialQuery={it.imageQueries[picker] ?? it.name}
            uploadKey={keyOf(`${it.imageQueries[picker] ?? it.name} ${it.size}`)}
            onClose={() => setPicker(null)}
            onPick={(src) => {
              const images = [...it.images];
              images[picker] = src;
              upd({ images, imageGuess: false });
              setPicker(null);
            }}
          />
        )}
      </div>

      <div>
        <label className="label">Nome</label>
        <textarea className="input" rows={2} value={it.name} onChange={(e) => upd({ name: e.target.value.toUpperCase() })} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="label">Tamanho</label>
          <input className="input" value={it.size} onChange={(e) => upd({ size: e.target.value.toUpperCase() })} />
        </div>
        <div>
          <label className="label">Preço</label>
          <input
            key={it.price}
            className="input text-right"
            inputMode="decimal"
            defaultValue={it.price.toFixed(2).replace(".", ",")}
            onBlur={(e) => {
              const v = Number(e.target.value.replace(",", "."));
              if (Number.isFinite(v) && v > 0) upd({ price: v });
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </div>
        <div>
          <label className="label">Unidade</label>
          <div className="flex overflow-hidden rounded-md border border-neutral-300">
            {(["UN", "KG"] as const).map((u) => (
              <button
                key={u}
                onClick={() => upd({ unit: u })}
                className={`flex-1 py-1.5 text-sm font-semibold ${it.unit === u ? "bg-neutral-900 text-white" : "bg-white"}`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Selo</label>
          <input
            className="input"
            placeholder="ex.: SOMENTE NATURAL"
            value={it.badge ?? ""}
            onChange={(e) => upd({ badge: e.target.value.toUpperCase() || undefined })}
          />
        </div>
        <div>
          <label className="label">Seção</label>
          <select className="input" value={it.section} onChange={(e) => upd({ section: e.target.value as Section })}>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>
                {SECTION_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-neutral-200 pt-3">
        <span className="label">Posição</span>
        {slot && page ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <button className="btn" onClick={() => moveWithin(-1)} disabled={slot.index === 0}>
                ◀
              </button>
              <span className="flex-1 text-center text-sm">
                posição {slot.index + 1} de {page.slots.length}
                {TEMPLATES[page.template].sidebar > slot.index ? " (lateral)" : ""}
              </span>
              <button className="btn" onClick={() => moveWithin(1)} disabled={slot.index === page.slots.length - 1}>
                ▶
              </button>
            </div>
            <select
              className="input"
              value={page.id}
              onChange={(e) => dispatch({ type: "moveToPage", itemId: it.id, pageId: e.target.value })}
            >
              {state.pages.map((p, i) => (
                <option key={p.id} value={p.id}>
                  Página {i + 1}: {p.title}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-neutral-500">Dica: arraste o card até outra posição ou outra página para trocar de lugar.</p>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Fora do encarte. Arraste para uma posição vazia ou escolha a página:</p>
        )}
        {!slot && (
          <select
            className="input mt-1"
            value=""
            onChange={(e) => e.target.value && dispatch({ type: "moveToPage", itemId: it.id, pageId: e.target.value })}
          >
            <option value="">Colocar na página…</option>
            {state.pages.map((p, i) => (
              <option key={p.id} value={p.id}>
                Página {i + 1}: {p.title}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-neutral-200 pt-3">
        {slot && (
          <button className="btn" onClick={() => dispatch({ type: "unplace", itemId: it.id })}>
            Tirar do encarte
          </button>
        )}
        <button
          className="btn text-red-700"
          onClick={() => {
            if (confirm(`Excluir "${it.name}"?`)) {
              dispatch({ type: "deleteItem", id: it.id });
              onDone();
            }
          }}
        >
          Excluir produto
        </button>
      </div>
    </div>
  );
}
