"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { DEFAULT_BRAND } from "./defaults";
import { fileToDataUrl, idb } from "./idb";
import { keyFromFilename, type BankEntry } from "./imagebank";
import { changeTemplate, pickTemplate, TEMPLATES } from "./layout";
import { uid } from "./normalize";
import seedBank from "./seed-bank.json";
import { clearTextCache } from "./textfit";
import type { Brand, Item, Page, ReviewEntry, TemplateId } from "./types";

export interface Slot {
  pageId: string;
  index: number;
}

export interface State {
  sourceText: string;
  items: Record<string, Item>;
  order: string[];
  pages: Page[];
  review: ReviewEntry[];
  brand: Brand;
}

const EMPTY: State = { sourceText: "", items: {}, order: [], pages: [], review: [], brand: DEFAULT_BRAND };
const LS_KEY = "encartes:v1";

type Action =
  | { type: "load"; state: State }
  | { type: "source"; text: string }
  | { type: "parsed"; items: Item[]; review: ReviewEntry[] }
  | { type: "setItems"; items: Item[] }
  | { type: "updateItem"; id: string; patch: Partial<Item> }
  | { type: "deleteItem"; id: string }
  | { type: "addItem"; item: Item }
  | { type: "setPages"; pages: Page[] }
  | { type: "swap"; from: Slot; to: Slot }
  | { type: "place"; itemId: string; to: Slot }
  | { type: "moveToPage"; itemId: string; pageId: string }
  | { type: "unplace"; itemId: string }
  | { type: "template"; pageId: string; template: TemplateId }
  | { type: "updatePage"; pageId: string; patch: Partial<Page> }
  | { type: "movePage"; pageId: string; dir: -1 | 1 }
  | { type: "deletePage"; pageId: string }
  | { type: "addPage"; template: TemplateId; title: string }
  | { type: "dismissReview"; index: number }
  | { type: "brand"; patch: Partial<Brand> };

function locate(pages: Page[], itemId: string): Slot | null {
  for (const p of pages) {
    const i = p.slots.indexOf(itemId);
    if (i >= 0) return { pageId: p.id, index: i };
  }
  return null;
}

function setSlot(pages: Page[], s: Slot, v: string | null): Page[] {
  return pages.map((p) => (p.id === s.pageId ? { ...p, slots: p.slots.map((x, i) => (i === s.index ? v : x)) } : p));
}

function getSlot(pages: Page[], s: Slot): string | null {
  return pages.find((p) => p.id === s.pageId)?.slots[s.index] ?? null;
}

function reducer(state: State, a: Action): State {
  switch (a.type) {
    case "load":
      return a.state;
    case "source":
      return { ...state, sourceText: a.text };
    case "parsed":
      return {
        ...state,
        items: Object.fromEntries(a.items.map((i) => [i.id, i])),
        order: a.items.map((i) => i.id),
        review: a.review,
        pages: [],
      };
    case "setItems": {
      const items = { ...state.items };
      for (const i of a.items) items[i.id] = i;
      return { ...state, items };
    }
    case "updateItem":
      return { ...state, items: { ...state.items, [a.id]: { ...state.items[a.id], ...a.patch } } };
    case "deleteItem": {
      const items = { ...state.items };
      delete items[a.id];
      return {
        ...state,
        items,
        order: state.order.filter((x) => x !== a.id),
        pages: state.pages.map((p) => ({ ...p, slots: p.slots.map((s) => (s === a.id ? null : s)) })),
        review: state.review.filter((r) => r.itemId !== a.id),
      };
    }
    case "addItem":
      return { ...state, items: { ...state.items, [a.item.id]: a.item }, order: [...state.order, a.item.id] };
    case "setPages":
      return { ...state, pages: a.pages };
    case "swap": {
      const x = getSlot(state.pages, a.from);
      const y = getSlot(state.pages, a.to);
      let pages = setSlot(state.pages, a.from, y);
      pages = setSlot(pages, a.to, x);
      return { ...state, pages };
    }
    case "place": {
      const from = locate(state.pages, a.itemId);
      if (from) return reducer(state, { type: "swap", from, to: a.to });
      return { ...state, pages: setSlot(state.pages, a.to, a.itemId) };
    }
    case "moveToPage": {
      let pages = state.pages;
      const from = locate(pages, a.itemId);
      if (from?.pageId === a.pageId) return state;
      if (from) pages = setSlot(pages, from, null);
      let target = pages.find((p) => p.id === a.pageId)!;
      let idx = target.slots.indexOf(null);
      if (idx < 0) {
        // página cheia: sobe para o próximo modelo que caiba
        const n = target.slots.length + 1;
        const t = pickTemplate(n);
        if (TEMPLATES[t].capacity < n) return state;
        pages = changeTemplate(pages, target.id, t);
        target = pages.find((p) => p.id === a.pageId)!;
        idx = target.slots.indexOf(null);
      }
      return { ...state, pages: setSlot(pages, { pageId: a.pageId, index: idx }, a.itemId) };
    }
    case "unplace": {
      const from = locate(state.pages, a.itemId);
      return from ? { ...state, pages: setSlot(state.pages, from, null) } : state;
    }
    case "template":
      return { ...state, pages: changeTemplate(state.pages, a.pageId, a.template) };
    case "updatePage":
      return { ...state, pages: state.pages.map((p) => (p.id === a.pageId ? { ...p, ...a.patch } : p)) };
    case "movePage": {
      const i = state.pages.findIndex((p) => p.id === a.pageId);
      const j = i + a.dir;
      if (i < 0 || j < 0 || j >= state.pages.length) return state;
      const pages = [...state.pages];
      [pages[i], pages[j]] = [pages[j], pages[i]];
      return { ...state, pages };
    }
    case "deletePage":
      return { ...state, pages: state.pages.filter((p) => p.id !== a.pageId) };
    case "addPage":
      return {
        ...state,
        pages: [
          ...state.pages,
          { id: uid("p"), title: a.title, template: a.template, slots: Array(TEMPLATES[a.template].capacity).fill(null) },
        ],
      };
    case "dismissReview":
      return { ...state, review: state.review.filter((_, i) => i !== a.index) };
    case "brand":
      return { ...state, brand: { ...state.brand, ...a.patch } };
  }
}

interface UserBankRecord {
  id: string;
  key: string;
  data: string;
  ean?: string;
}

interface Ctx {
  state: State;
  dispatch: (a: Action) => void;
  ready: boolean;
  bank: BankEntry[];
  resolve: (ref: string | null | undefined) => string;
  addBankFiles: (files: File[], keyOverride?: string) => Promise<BankEntry[]>;
  removeBankEntry: (src: string) => Promise<void>;
  updateBankEntry: (src: string, patch: { key?: string; ean?: string }) => Promise<void>;
  setAsset: (file: File) => Promise<string>;
  unplacedIds: string[];
  fontsReady: boolean;
}

const StoreCtx = createContext<Ctx | null>(null);

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
/** versão em arquivo único: fotos e marca embutidas como data: URI */
const INLINE_ASSETS: Record<string, string> | undefined =
  typeof window !== "undefined" ? (window as { __ENCARTES_ASSETS__?: Record<string, string> }).__ENCARTES_ASSETS__ : undefined;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY);
  const [ready, setReady] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [userBank, setUserBank] = useState<UserBankRecord[]>([]);
  const [assets, setAssets] = useState<Record<string, string>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // fontes: medir os nomes só depois de carregadas
  useEffect(() => {
    Promise.all([
      document.fonts.load('800 40px "Barlow Condensed"'),
      document.fonts.load('700 40px "Barlow Condensed"'),
      document.fonts.load('40px "Anton"'),
    ])
      .catch(() => {})
      .finally(() => {
        clearTextCache();
        setFontsReady(true);
      });
  }, []);

  // carregar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw) as State;
        dispatch({ type: "load", state: { ...EMPTY, ...s, brand: { ...DEFAULT_BRAND, ...s.brand } } });
      }
    } catch {
      /* armazenamento indisponível */
    }
    Promise.all([idb.all<UserBankRecord>("bank"), idb.all<{ id: string; data: string }>("assets")])
      .then(([b, a]) => {
        setUserBank(b);
        setAssets(Object.fromEntries(a.map((x) => [x.id, x.data])));
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // salvar (com atraso)
  useEffect(() => {
    if (!ready) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(state));
      } catch {
        /* cheio ou bloqueado */
      }
    }, 300);
  }, [state, ready]);

  const bank = useMemo<BankEntry[]>(
    () => [
      ...userBank.map((u) => ({ key: u.key, src: `idb:bank:${u.id}`, ean: u.ean, user: true })),
      ...(seedBank as BankEntry[]),
    ],
    [userBank],
  );

  const userData = useMemo(() => Object.fromEntries(userBank.map((u) => [u.id, u.data])), [userBank]);

  const resolve = useCallback(
    (ref: string | null | undefined) => {
      if (!ref) return INLINE_ASSETS?.["placeholder.svg"] ?? `${BASE_PATH}/placeholder.svg`;
      if (ref.startsWith("idb:bank:")) return userData[ref.slice(9)] ?? `${BASE_PATH}/placeholder.svg`;
      if (ref.startsWith("idb:assets:")) return assets[ref.slice(11)] ?? `${BASE_PATH}/placeholder.svg`;
      if (/^(data:|https?:|blob:)/.test(ref)) return ref;
      const inlined = INLINE_ASSETS?.[ref];
      if (inlined) return inlined;
      return `${BASE_PATH}/${ref}`;
    },
    [userData, assets],
  );

  const addBankFiles = useCallback(async (files: File[], keyOverride?: string) => {
    const recs: UserBankRecord[] = [];
    for (const f of files) {
      const data = await fileToDataUrl(f);
      const rec = { id: uid("b"), key: keyOverride ?? keyFromFilename(f.name), data };
      await idb.put("bank", rec).catch(() => {}); // sem IndexedDB: fica só nesta sessão
      recs.push(rec);
    }
    setUserBank((b) => [...recs, ...b]);
    return recs.map((r) => ({ key: r.key, src: `idb:bank:${r.id}`, user: true }));
  }, []);

  const removeBankEntry = useCallback(async (src: string) => {
    const id = src.replace("idb:bank:", "");
    await idb.del("bank", id).catch(() => {});
    setUserBank((b) => b.filter((x) => x.id !== id));
  }, []);

  const updateBankEntry = useCallback(
    async (src: string, patch: { key?: string; ean?: string }) => {
      const id = src.replace("idb:bank:", "");
      const cur = userBank.find((x) => x.id === id);
      if (!cur) return;
      const next = { ...cur, ...patch };
      await idb.put("bank", next).catch(() => {});
      setUserBank((b) => b.map((x) => (x.id === id ? next : x)));
    },
    [userBank],
  );

  const setAsset = useCallback(async (file: File) => {
    const data = await fileToDataUrl(file, 1600);
    const id = uid("a");
    await idb.put("assets", { id, data }).catch(() => {});
    setAssets((a) => ({ ...a, [id]: data }));
    return `idb:assets:${id}`;
  }, []);

  const unplacedIds = useMemo(() => {
    const placed = new Set(state.pages.flatMap((p) => p.slots));
    return state.order.filter((id) => !placed.has(id));
  }, [state.pages, state.order]);

  const value: Ctx = {
    state,
    dispatch,
    ready,
    bank,
    resolve,
    addBankFiles,
    removeBankEntry,
    updateBankEntry,
    setAsset,
    unplacedIds,
    fontsReady,
  };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore fora do StoreProvider");
  return c;
}
