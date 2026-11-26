/** IndexedDB mínimo: fotos enviadas pelo usuário (banco) e arquivos da marca (logo/banner) */
const DB = "encartes";
const VERSION = 1;
export type StoreName = "bank" | "assets";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("bank")) db.createObjectStore("bank", { keyPath: "id" });
      if (!db.objectStoreNames.contains("assets")) db.createObjectStore("assets", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const idb = {
  all: <T>(store: StoreName) => tx<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>),
  put: <T>(store: StoreName, value: T) => tx(store, "readwrite", (s) => s.put(value)),
  del: (store: StoreName, id: string) => tx(store, "readwrite", (s) => s.delete(id)),
};

/** reduz a imagem (lado maior <= max) e devolve data URL PNG (mantém transparência) */
export function fileToDataUrl(file: File, max = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const isJpg = /jpe?g/i.test(file.type);
      resolve(isJpg ? c.toDataURL("image/jpeg", 0.9) : c.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Imagem inválida: " + file.name));
    img.src = url;
  });
}
