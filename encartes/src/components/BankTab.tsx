"use client";

import { useMemo, useRef, useState } from "react";
import { assignImages } from "@/lib/match";
import { useStore } from "@/lib/store";
import { searchBank } from "./ImagePicker";

export function BankTab() {
  const { bank, resolve, addBankFiles, removeBankEntry, updateBankEntry, state, dispatch } = useStore();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const list = useMemo(() => (q.trim() ? searchBank(bank, q, 500) : bank), [bank, q]);
  const missing = state.order.filter((id) => state.items[id]?.images.some((x) => !x)).length;

  async function upload(files: File[]) {
    setBusy(true);
    try {
      const added = await addBankFiles(files);
      setMsg(`${added.length} imagem(ns) adicionada(s).`);
    } finally {
      setBusy(false);
    }
  }

  function rematch() {
    const items = state.order.map((id) => state.items[id]);
    const updated = assignImages(items, bank);
    dispatch({ type: "setItems", items: updated });
    const before = items.reduce((n, i) => n + i.images.filter((x) => !x).length, 0);
    const after = updated.reduce((n, i) => n + i.images.filter((x) => !x).length, 0);
    setMsg(`${before - after} imagem(ns) encontrada(s) para produtos que estavam sem foto.`);
  }

  return (
    <div className="mx-auto max-w-7xl p-4">
      <div
        className="card mb-4 flex flex-wrap items-center gap-3 p-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
          if (files.length) upload(files);
        }}
      >
        <div className="min-w-[260px] flex-1">
          <h2 className="font-bold">Banco de imagens · {bank.length} fotos</h2>
          <p className="text-xs text-neutral-500">
            Envie várias de uma vez (ou arraste para cá). O nome do arquivo vira o nome do produto:{" "}
            <code>skol 300ml.png</code> → <code>SKOL 300ML</code>. Prefira fotos do fornecedor ou fotos próprias (imagens da
            internet podem ter direito autoral). PNG com fundo transparente fica melhor.
          </p>
        </div>
        <input className="input max-w-xs" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? "Enviando…" : "Enviar imagens"}
        </button>
        {missing > 0 && (
          <button className="btn" onClick={rematch} title="Procura de novo as imagens dos produtos que estão sem foto">
            Reassociar produtos sem foto ({missing})
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            if (files.length) upload(files);
            e.target.value = "";
          }}
        />
      </div>
      {msg && <div className="mb-3 rounded bg-green-50 px-3 py-2 text-sm text-green-800">{msg}</div>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {list.map((b) => (
          <div key={b.src} className="card overflow-hidden">
            <div className="aspect-square bg-white p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolve(b.src)} alt={b.key} className="h-full w-full object-contain" loading="lazy" />
            </div>
            <div className="border-t border-neutral-100 p-1">
              {b.user ? (
                <>
                  <input
                    className="w-full rounded px-1 text-[11px] font-semibold hover:bg-neutral-50"
                    defaultValue={b.key}
                    onBlur={(e) => e.target.value !== b.key && updateBankEntry(b.src, { key: e.target.value.toUpperCase() })}
                  />
                  <div className="flex items-center gap-1">
                    <input
                      className="min-w-0 flex-1 rounded px-1 text-[10px] text-neutral-500 hover:bg-neutral-50"
                      placeholder="EAN"
                      defaultValue={b.ean ?? ""}
                      onBlur={(e) => e.target.value !== (b.ean ?? "") && updateBankEntry(b.src, { ean: e.target.value.trim() || undefined })}
                    />
                    <button
                      className="text-[11px] text-neutral-400 hover:text-red-600"
                      title="Excluir"
                      onClick={() => confirm(`Excluir a imagem ${b.key}?`) && removeBankEntry(b.src)}
                    >
                      ✕
                    </button>
                  </div>
                </>
              ) : (
                <div className="truncate px-1 text-[11px] font-semibold" title={b.key}>
                  {b.key}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
