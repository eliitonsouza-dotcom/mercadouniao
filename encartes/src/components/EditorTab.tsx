"use client";

import { useConfirm } from "./Confirm";
import { useRef, useState, type DragEvent } from "react";
import { download, pageToPng, pagesToPdf, slug } from "@/lib/exporter";
import { TEMPLATE_ORDER, TEMPLATES } from "@/lib/layout";
import { useStore, type Slot } from "@/lib/store";
import type { TemplateId } from "@/lib/types";
import { FlyerPage, ScaledPage } from "./FlyerPage";
import { ItemPanel } from "./ItemPanel";

type Sel = { kind: "item"; itemId: string } | { kind: "empty"; pageId: string; index: number } | null;

const DND = "application/x-encarte-item";

export function EditorTab({ goToList }: { goToList: () => void }) {
  const { state, dispatch, resolve, unplacedIds } = useStore();
  const [sel, setSel] = useState<Sel>(null);
  const [scale, setScale] = useState(() => (typeof window === "undefined" ? 0.42 : Math.min(0.42, (window.innerWidth - 40) / 1080)));
  const [busy, setBusy] = useState<string | null>(null);
  const ask = useConfirm();
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const [err, setErr] = useState<string | null>(null);
  const alertMsg = (m: string) => {
    setErr(m);
    setTimeout(() => setErr(null), 6000);
  };

  if (!state.pages.length) {
    return (
      <div className="mx-auto max-w-xl p-10 text-center">
        <p className="mb-4 text-neutral-600">Ainda não há encarte. Interprete a lista e clique em “Gerar encarte”.</p>
        <button className="btn-primary" onClick={goToList}>
          Ir para a lista
        </button>
      </div>
    );
  }

  const locate = (itemId: string): Slot | null => {
    for (const p of state.pages) {
      const i = p.slots.indexOf(itemId);
      if (i >= 0) return { pageId: p.id, index: i };
    }
    return null;
  };

  const selSlot: Slot | null = sel?.kind === "item" ? locate(sel.itemId) : sel?.kind === "empty" ? sel : null;

  const onDrop = (pageId: string, index: number, e: DragEvent) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData(DND);
    if (!itemId) return;
    dispatch({ type: "place", itemId, to: { pageId, index } });
    setSel({ kind: "item", itemId });
  };

  async function exportOne(pageId: string, i: number) {
    const node = nodes.current.get(pageId);
    if (!node) return;
    setBusy(`Gerando página ${i + 1}…`);
    try {
      const png = await pageToPng(node);
      await download(png, `encarte-${String(i + 1).padStart(2, "0")}-${slug(state.pages[i].title)}.png`);
    } catch (e) {
      setBusy(null);
      alertMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function exportAll() {
    setSel(null);
    for (let i = 0; i < state.pages.length; i++) {
      await exportOne(state.pages[i].id, i);
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  async function exportPdf() {
    setSel(null);
    setBusy("Gerando PDF…");
    try {
      const ns = state.pages.map((p) => nodes.current.get(p.id)).filter((n): n is HTMLDivElement => !!n);
      await pagesToPdf(ns, "encarte.pdf");
    } catch (e) {
      alertMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:flex-row">
      <div className="min-w-0 flex-1">
        <div className="card mb-4 flex flex-wrap items-center gap-2 p-2">
          <span className="text-sm font-semibold">{state.pages.length} páginas</span>
          <label className="ml-2 flex items-center gap-2 text-xs text-neutral-500">
            zoom
            <input type="range" min={0.2} max={0.8} step={0.01} value={scale} onChange={(e) => setScale(Number(e.target.value))} />
          </label>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              className="btn"
              onClick={() => dispatch({ type: "addPage", template: "L15", title: `Página ${state.pages.length + 1}` })}
            >
              + Página
            </button>
            <button className="btn" onClick={exportAll} disabled={!!busy}>
              Baixar todas (PNG)
            </button>
            <button className="btn-primary" onClick={exportPdf} disabled={!!busy}>
              Baixar PDF
            </button>
          </div>
        </div>
        {err && <div className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded bg-red-700 px-4 py-2 text-sm text-white">{err}</div>}
        {busy && <div className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded bg-neutral-900 px-4 py-2 text-sm text-white">{busy}</div>}

        <div className="flex flex-wrap gap-6">
          {state.pages.map((page, i) => (
            <div key={page.id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1" style={{ width: 1080 * scale }}>
                <span className="text-xs font-bold text-neutral-500">{i + 1}</span>
                <input
                  className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 text-sm font-semibold hover:border-neutral-300"
                  value={page.title}
                  onChange={(e) => dispatch({ type: "updatePage", pageId: page.id, patch: { title: e.target.value } })}
                />
                <select
                  className="rounded border border-neutral-300 bg-white px-1 py-0.5 text-xs"
                  value={page.template}
                  title="Modelo da página"
                  onChange={(e) => dispatch({ type: "template", pageId: page.id, template: e.target.value as TemplateId })}
                >
                  {TEMPLATE_ORDER.map((t) => (
                    <option key={t} value={t}>
                      {TEMPLATES[t].label}
                    </option>
                  ))}
                </select>
                <button className="px-1 text-neutral-500 hover:text-black" title="Mover página para trás" onClick={() => dispatch({ type: "movePage", pageId: page.id, dir: -1 })}>
                  ↑
                </button>
                <button className="px-1 text-neutral-500 hover:text-black" title="Mover página para frente" onClick={() => dispatch({ type: "movePage", pageId: page.id, dir: 1 })}>
                  ↓
                </button>
                <button className="px-1 text-neutral-500 hover:text-black" title="Baixar PNG" onClick={() => exportOne(page.id, i)} disabled={!!busy}>
                  ⤓
                </button>
                <button
                  className="px-1 text-neutral-400 hover:text-red-600"
                  title="Excluir página (os produtos vão para “Fora do encarte”)"
                  onClick={async () => (await ask("Excluir esta página? Os produtos dela vão para “Fora do encarte”.", "Excluir")) && dispatch({ type: "deletePage", pageId: page.id })}
                >
                  ✕
                </button>
              </div>
              <div className="overflow-hidden rounded shadow-md ring-1 ring-black/10">
                <ScaledPage
                  scale={scale}
                  innerRef={(n) => {
                    if (n) nodes.current.set(page.id, n);
                    else nodes.current.delete(page.id);
                  }}
                >
                  <FlyerPage
                    page={page}
                    items={state.items}
                    brand={state.brand}
                    resolve={resolve}
                    interaction={{
                      selectedSlot: selSlot?.pageId === page.id ? selSlot.index : null,
                      onSelect: (idx) => {
                        const id = page.slots[idx];
                        setSel(id ? { kind: "item", itemId: id } : { kind: "empty", pageId: page.id, index: idx });
                      },
                      onDragStartSlot: (idx, e) => {
                        const id = page.slots[idx];
                        if (id) e.dataTransfer.setData(DND, id);
                      },
                      onDropSlot: (idx, e) => onDrop(page.id, idx, e),
                    }}
                  />
                </ScaledPage>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="flex w-full flex-none flex-col gap-3 md:sticky md:top-16 md:max-h-[calc(100vh-5rem)] md:w-[340px] md:overflow-y-auto">
        <div className="card p-3">
          {sel?.kind === "item" && state.items[sel.itemId] ? (
            <ItemPanel itemId={sel.itemId} slot={selSlot} onDone={() => setSel(null)} />
          ) : sel?.kind === "empty" ? (
            <div className="text-sm">
              <h3 className="mb-1 font-bold">Posição vazia</h3>
              <p className="text-neutral-500">
                {unplacedIds.length
                  ? "Escolha um produto de “Fora do encarte” abaixo ou arraste um card até aqui."
                  : "Arraste um card de outra posição até aqui."}
              </p>
            </div>
          ) : (
            <div className="text-sm text-neutral-500">
              <h3 className="mb-1 font-bold text-neutral-900">Editar</h3>
              Clique num produto para trocar a imagem, o nome, o preço, a unidade ou o selo. Arraste para mudar de posição ou de
              página. O modelo de cada página fica no seletor acima dela.
            </div>
          )}
        </div>

        <div className="card p-3">
          <h3 className="mb-2 text-sm font-bold">
            Fora do encarte <span className="font-normal text-neutral-500">({unplacedIds.length})</span>
          </h3>
          {!unplacedIds.length && <p className="text-xs text-neutral-500">Todos os produtos estão nas páginas.</p>}
          <ul className="space-y-1">
            {unplacedIds.map((id) => {
              const it = state.items[id];
              return (
                <li
                  key={id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData(DND, id)}
                  className={`flex cursor-grab items-center gap-2 rounded border px-2 py-1 text-xs ${
                    sel?.kind === "item" && sel.itemId === id ? "border-blue-500 bg-blue-50" : "border-neutral-200 bg-white"
                  }`}
                  onClick={() => {
                    if (sel?.kind === "empty") {
                      dispatch({ type: "place", itemId: id, to: { pageId: sel.pageId, index: sel.index } });
                    }
                    setSel({ kind: "item", itemId: id });
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resolve(it.images[0])} alt="" className="h-8 w-8 flex-none object-contain" />
                  <span className="min-w-0 flex-1 truncate">{it.name}</span>
                  <b>{it.price.toFixed(2).replace(".", ",")}</b>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
