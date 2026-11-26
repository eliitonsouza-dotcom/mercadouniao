"use client";

import { useState } from "react";
import { BankTab } from "@/components/BankTab";
import { BrandTab } from "@/components/BrandTab";
import { ConfirmProvider } from "@/components/Confirm";
import { EditorTab } from "@/components/EditorTab";
import { ListTab } from "@/components/ListTab";
import { StoreProvider, useStore } from "@/lib/store";

type Tab = "lista" | "encarte" | "banco" | "marca";

const TABS: { id: Tab; label: string }[] = [
  { id: "lista", label: "1. Lista de ofertas" },
  { id: "encarte", label: "2. Encarte" },
  { id: "banco", label: "Banco de imagens" },
  { id: "marca", label: "Marca" },
];

function App() {
  const { ready, fontsReady, state } = useStore();
  const [tab, setTab] = useState<Tab>("lista");
  if (!ready || !fontsReady) return <div className="p-8 text-neutral-500">Carregando…</div>;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-neutral-200 bg-white px-4 py-2">
        <div className="text-lg font-black tracking-tight">
          <span className="text-red-700">Encartes</span> · Mercado União
        </div>
        <nav className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                tab === t.id ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {t.label}
              {t.id === "encarte" && state.pages.length > 0 && (
                <span className="ml-1.5 rounded bg-red-600 px-1.5 text-xs text-white">{state.pages.length}</span>
              )}
            </button>
          ))}
        </nav>
      </header>
      <main className="flex-1">
        {tab === "lista" && <ListTab onGenerated={() => setTab("encarte")} />}
        {tab === "encarte" && <EditorTab goToList={() => setTab("lista")} />}
        {tab === "banco" && <BankTab />}
        {tab === "marca" && <BrandTab />}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <StoreProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </StoreProvider>
  );
}
