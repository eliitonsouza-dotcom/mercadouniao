"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Ask = (message: string, okLabel?: string) => Promise<boolean>;
const Ctx = createContext<Ask>(async () => true);

/** caixa de confirmação própria (o confirm() do navegador não funciona dentro de alguns visualizadores) */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<{ message: string; ok: string; resolve: (v: boolean) => void } | null>(null);
  const ask = useCallback<Ask>(
    (message, ok = "Confirmar") => new Promise<boolean>((resolve) => setReq({ message, ok, resolve })),
    [],
  );
  const close = (v: boolean) => {
    req?.resolve(v);
    setReq(null);
  };
  return (
    <Ctx.Provider value={ask}>
      {children}
      {req && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => close(false)}>
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-lg bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === "Escape" && close(false)}
          >
            <p className="mb-4 text-sm">{req.message}</p>
            <div className="flex justify-end gap-2">
              <button className="btn" onClick={() => close(false)}>
                Cancelar
              </button>
              <button className="btn-primary" autoFocus onClick={() => close(true)}>
                {req.ok}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export const useConfirm = () => useContext(Ctx);
