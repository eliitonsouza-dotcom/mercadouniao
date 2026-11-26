"use client";

import { useMemo } from "react";
import { distribute } from "@/lib/layout";
import { assignImages } from "@/lib/match";
import { parseList } from "@/lib/parser";
import { SAMPLE_LIST } from "@/lib/sample";
import { useStore } from "@/lib/store";
import { SECTION_LABEL, type Item, type ReviewReason, type Section } from "@/lib/types";

const REASON_LABEL: Record<ReviewReason, { label: string; cls: string }> = {
  "sem-preco": { label: "Sem preço", cls: "bg-amber-100 text-amber-800" },
  "preco-absurdo": { label: "Preço estranho", cls: "bg-red-100 text-red-800" },
  duplicado: { label: "Duplicado?", cls: "bg-purple-100 text-purple-800" },
  "linha-ignorada": { label: "Ignorada", cls: "bg-neutral-200 text-neutral-700" },
};

const SECTIONS = Object.keys(SECTION_LABEL) as Section[];

export function ListTab({ onGenerated }: { onGenerated: () => void }) {
  const { state, dispatch, bank } = useStore();
  const items = state.order.map((id) => state.items[id]).filter(Boolean);

  const bySection = useMemo(() => {
    const m = new Map<Section, Item[]>();
    for (const s of SECTIONS) m.set(s, []);
    for (const it of items) m.get(it.section)!.push(it);
    return m;
  }, [items]);

  function interpret() {
    if (state.pages.length && !confirm("Interpretar de novo apaga o encarte atual. Continuar?")) return;
    const r = parseList(state.sourceText);
    dispatch({ type: "parsed", items: r.items, review: r.review });
    if (r.validity.end) dispatch({ type: "brand", patch: { validityEnd: r.validity.end } });
  }

  function generate() {
    if (state.pages.length && !confirm("Gerar de novo refaz todas as páginas (as edições de posição se perdem). Continuar?")) return;
    const withImgs = assignImages(items, bank);
    dispatch({ type: "setItems", items: withImgs });
    dispatch({ type: "setPages", pages: distribute(withImgs) });
    onGenerated();
  }

  const upd = (id: string, patch: Partial<Item>) => dispatch({ type: "updateItem", id, patch });

  return (
    <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
      <section className="card flex flex-col p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-bold">Cole a lista do mercado</h2>
          <button className="btn" onClick={() => dispatch({ type: "source", text: SAMPLE_LIST })}>
            Usar lista de exemplo
          </button>
        </div>
        <textarea
          className="input min-h-[420px] flex-1 font-mono text-xs leading-5"
          placeholder={"BOM DIA, PROMOCOES VALIDA DE 20/11 ATE 23/11\n\nCERVEJA SKOL 300 ML 2,49\nPATINHO BOVINO KG 43,99\n…"}
          value={state.sourceText}
          onChange={(e) => dispatch({ type: "source", text: e.target.value })}
        />
        <p className="mt-2 text-xs text-neutral-500">
          Uma oferta por linha (também aceita <code>;</code> <code>|</code> tab e <code>&quot; - &quot;</code>). Linhas em branco separam as
          seções. O preço é o último número com 2 casas decimais. O texto depois do preço vira selo.
        </p>
        <button className="btn-primary mt-3 justify-center py-2" onClick={interpret} disabled={!state.sourceText.trim()}>
          Interpretar lista
        </button>
      </section>

      <section className="flex min-w-0 flex-col gap-4">
        {!items.length ? (
          <div className="card p-8 text-center text-neutral-500">
            Cole a lista e clique em <b>Interpretar lista</b>. Os produtos aparecem aqui, separados por seção, para conferir antes
            de gerar o encarte.
          </div>
        ) : (
          <>
            <div className="card flex flex-wrap items-center gap-3 p-3">
              <div className="text-sm">
                <b>{items.length}</b> produtos ·{" "}
                {SECTIONS.filter((s) => bySection.get(s)!.length)
                  .map((s) => `${SECTION_LABEL[s]} ${bySection.get(s)!.length}`)
                  .join(" · ")}
              </div>
              {state.brand.validityEnd && (
                <div className="rounded bg-neutral-100 px-2 py-0.5 text-xs">Validade: até {state.brand.validityEnd}</div>
              )}
              <button className="btn-primary ml-auto" onClick={generate}>
                Gerar encarte →
              </button>
            </div>

            {state.review.length > 0 && (
              <div className="card border-amber-300 bg-amber-50 p-3">
                <h3 className="mb-2 text-sm font-bold">Para revisar ({state.review.length})</h3>
                <ul className="space-y-1.5">
                  {state.review.map((r, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${REASON_LABEL[r.reason].cls}`}>
                        {REASON_LABEL[r.reason].label}
                      </span>
                      <code className="text-xs">{r.line}</code>
                      <span className="text-xs text-neutral-500">{r.message}</span>
                      <span className="ml-auto flex gap-1">
                        {r.reason === "duplicado" && r.itemId && (
                          <button
                            className="btn py-0.5 text-xs"
                            onClick={() => {
                              dispatch({ type: "deleteItem", id: r.itemId! });
                            }}
                          >
                            Remover repetido
                          </button>
                        )}
                        <button className="btn py-0.5 text-xs" onClick={() => dispatch({ type: "dismissReview", index: i })}>
                          {r.reason === "duplicado" ? "Manter os dois" : "OK"}
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {SECTIONS.filter((s) => bySection.get(s)!.length).map((s) => (
              <div key={s} className="card overflow-hidden">
                <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm font-bold">
                  {SECTION_LABEL[s]} <span className="font-normal text-neutral-500">({bySection.get(s)!.length})</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-neutral-500">
                      <tr>
                        <th className="px-2 py-1">Produto</th>
                        <th className="px-2 py-1">Tamanho</th>
                        <th className="px-2 py-1">Preço</th>
                        <th className="px-2 py-1">Un.</th>
                        <th className="px-2 py-1">Seção</th>
                        <th className="px-2 py-1">Selo</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {bySection.get(s)!.map((it) => (
                        <tr key={it.id} className={`border-t border-neutral-100 ${it.confidence < 0.8 ? "bg-amber-50/60" : ""}`}>
                          <td className="px-2 py-1">
                            <input className="input min-w-[220px] py-1" value={it.name} onChange={(e) => upd(it.id, { name: e.target.value.toUpperCase() })} />
                          </td>
                          <td className="px-2 py-1">
                            <input className="input w-24 py-1" value={it.size} onChange={(e) => upd(it.id, { size: e.target.value.toUpperCase() })} />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              key={it.price}
                              className="input w-20 py-1 text-right"
                              inputMode="decimal"
                              defaultValue={it.price.toFixed(2).replace(".", ",")}
                              onBlur={(e) => {
                                const v = Number(e.target.value.replace(",", "."));
                                if (Number.isFinite(v) && v > 0) upd(it.id, { price: v });
                              }}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <select className="input w-16 py-1" value={it.unit} onChange={(e) => upd(it.id, { unit: e.target.value as Item["unit"] })}>
                              <option>UN</option>
                              <option>KG</option>
                            </select>
                          </td>
                          <td className="px-2 py-1">
                            <select className="input w-36 py-1" value={it.section} onChange={(e) => upd(it.id, { section: e.target.value as Section })}>
                              {SECTIONS.map((x) => (
                                <option key={x} value={x}>
                                  {SECTION_LABEL[x]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1">
                            <input
                              className="input w-36 py-1"
                              value={it.badge ?? ""}
                              onChange={(e) => upd(it.id, { badge: e.target.value.toUpperCase() || undefined })}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <button
                              className="text-neutral-400 hover:text-red-600"
                              title="Excluir"
                              onClick={() => dispatch({ type: "deleteItem", id: it.id })}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </>
        )}
      </section>
    </div>
  );
}
