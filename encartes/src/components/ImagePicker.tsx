"use client";

import { useMemo, useRef, useState } from "react";
import type { BankEntry } from "@/lib/imagebank";
import { stem, words } from "@/lib/normalize";
import { useStore } from "@/lib/store";

/** busca no banco: ordena pelas palavras da busca que aparecem na chave */
export function searchBank(bank: BankEntry[], q: string, limit = 60): BankEntry[] {
  const qs = words(q).map(stem).filter((w) => w.length > 1);
  if (!qs.length) return bank.slice(0, limit);
  return bank
    .map((b) => {
      const kw = words(b.key).map(stem);
      const score = qs.filter((w) => kw.some((k) => k.startsWith(w))).length;
      return { b, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.b.key.localeCompare(b.b.key))
    .slice(0, limit)
    .map((x) => x.b);
}

export function ImagePicker({
  initialQuery,
  uploadKey,
  onPick,
  onClose,
}: {
  initialQuery: string;
  uploadKey: string;
  onPick: (src: string) => void;
  onClose: () => void;
}) {
  const { bank, resolve, addBankFiles } = useStore();
  const [q, setQ] = useState(initialQuery);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchBank(bank, q), [bank, q]);

  return (
    <div className="mt-2 rounded-md border border-blue-200 bg-blue-50/50 p-2">
      <div className="mb-2 flex gap-1">
        <input className="input py-1" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no banco…" />
        <button className="btn py-1" onClick={onClose}>
          Fechar
        </button>
      </div>
      <div className="grid max-h-72 grid-cols-4 gap-1 overflow-y-auto">
        <button
          className="flex aspect-square flex-col items-center justify-center rounded border-2 border-dashed border-neutral-300 bg-white text-xs text-neutral-500 hover:border-blue-500"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          <span className="text-2xl leading-none">+</span>
          {busy ? "enviando…" : "enviar foto"}
        </button>
        {results.map((b) => (
          <button
            key={b.src}
            title={b.key}
            onClick={() => onPick(b.src)}
            className="group relative aspect-square overflow-hidden rounded border border-neutral-200 bg-white hover:border-blue-500"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolve(b.src)} alt={b.key} className="h-full w-full object-contain" loading="lazy" />
            <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-0.5 text-[9px] text-white">{b.key}</span>
          </button>
        ))}
      </div>
      {!results.length && <p className="p-2 text-xs text-neutral-500">Nada encontrado. Envie uma foto.</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try {
            const [entry] = await addBankFiles([f], uploadKey);
            onPick(entry.src);
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      <p className="mt-1 text-[11px] text-neutral-500">A foto enviada entra no banco com o nome do produto e é reaproveitada nos próximos encartes.</p>
    </div>
  );
}
