"use client";

import type { CSSProperties, DragEvent } from "react";
import { FONTS } from "@/lib/defaults";
import { AREA, cells, PAGE_H, PAGE_W, PANEL_L, SIDEBAR, TEMPLATES, type Cell } from "@/lib/layout";
import { fitName } from "@/lib/textfit";
import type { Brand, Item, Page, Unit } from "@/lib/types";

/* ---------------------------------------------------------------- preço */

export function splitPrice(price: number): { reais: string; cents: string } {
  const c = Math.round(price * 100);
  return { reais: String(Math.floor(c / 100)), cents: String(c % 100).padStart(2, "0") };
}

/** largura estimada da etiqueta em múltiplos da altura */
function tagWidthFactor(reais: string): number {
  return 1.05 + 0.6 * reais.length;
}

export function PriceTag({
  price,
  unit,
  h,
  color,
  font,
}: {
  price: number;
  unit: Unit;
  h: number;
  color: string;
  font: string;
}) {
  const { reais, cents } = splitPrice(price);
  const pad = h * 0.1;
  const inner = h - pad * 2;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        background: color,
        color: "#fff",
        height: h,
        borderRadius: h * 0.2,
        padding: `${pad}px ${h * 0.14}px ${pad}px ${h * 0.12}px`,
        fontFamily: font,
        boxShadow: `0 ${h * 0.05}px ${h * 0.12}px rgba(0,0,0,.25)`,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ alignSelf: "flex-end", fontSize: inner * 0.24, lineHeight: 1, marginRight: h * 0.05, marginBottom: inner * 0.02 }}>
        R$
      </span>
      <span style={{ fontSize: inner * 1.22, lineHeight: `${inner}px`, letterSpacing: -inner * 0.02, display: "block", height: inner }}>
        {reais}
      </span>
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginLeft: h * 0.04,
        }}
      >
        <span style={{ fontSize: inner * 0.5, lineHeight: 1 }}>,{cents}</span>
        <span style={{ fontSize: inner * 0.26, lineHeight: 1, paddingLeft: inner * 0.04 }}>{unit}</span>
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- card */

function displayName(it: Item): string {
  return [it.name, it.size].filter(Boolean).join(" ");
}

function Images({ it, resolve, size }: { it: Item; resolve: (r: string | null) => string; size: CSSProperties }) {
  const srcs = it.images.length ? it.images : [null];
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", ...size }}>
      {srcs.map((s, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={resolve(s)}
          alt=""
          draggable={false}
          style={{
            width: `${100 / srcs.length + (srcs.length > 1 ? 8 : 0)}%`,
            height: "100%",
            objectFit: "contain",
            mixBlendMode: "multiply",
            marginLeft: i > 0 ? "-8%" : 0,
          }}
        />
      ))}
    </div>
  );
}

function Badge({ text, fs, inverted }: { text: string; fs: number; inverted: boolean }) {
  return (
    <div
      style={{
        display: "inline-block",
        background: inverted ? "#000" : "#FFD200",
        color: inverted ? "#FFD200" : "#000",
        fontSize: fs,
        fontWeight: 800,
        lineHeight: 1,
        padding: `${fs * 0.28}px ${fs * 0.7}px`,
        borderRadius: 999,
        whiteSpace: "nowrap",
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      {text}
    </div>
  );
}

export function ProductCard({
  it,
  cell,
  brand,
  resolve,
}: {
  it: Item;
  cell: Cell;
  brand: Brand;
  resolve: (r: string | null) => string;
}) {
  const f = FONTS[brand.font];
  const name = displayName(it);
  const { reais } = splitPrice(it.price);
  const { w, h } = cell;

  if (cell.horizontal) {
    const p = h * 0.06;
    const rw = w * 0.52 - p;
    const tagH = Math.min(h * 0.3, (rw * 0.95) / tagWidthFactor(reais));
    const maxFs = h * 0.12;
    const { fs } = fitName(name, f.name, rw * 0.96, maxFs);
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", padding: p, gap: p * 0.5 }}>
        <Images it={it} resolve={resolve} size={{ width: "48%", height: "100%" }} />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: h * 0.04,
            textAlign: "center",
          }}
        >
          {it.badge && <Badge text={it.badge} fs={h * 0.055} inverted={false} />}
          <div
            style={{
              fontFamily: f.name,
              fontWeight: 800,
              fontSize: fs,
              lineHeight: 1,
              color: "#111",
              textTransform: "uppercase",
              maxHeight: maxFs * 2.2,
              display: "flex",
              alignItems: "center",
            }}
          >
            {name}
          </div>
          <PriceTag price={it.price} unit={it.unit} h={tagH} color={brand.colors.priceTag} font={f.price} />
        </div>
      </div>
    );
  }

  const p = Math.min(w, h) * 0.05;
  const iw = w - p * 2;
  // áreas de nome e preço com altura fixa: cards da mesma página ficam alinhados
  const tagArea = Math.min(h * 0.24, (iw * 0.98) / tagWidthFactor("00"));
  const tagH = Math.min(tagArea, (iw * 0.98) / tagWidthFactor(reais));
  const maxFs = Math.min(w * 0.1, h * 0.075);
  const { fs } = fitName(name, f.name, iw * 0.96, maxFs);
  const badgeFs = Math.min(w * 0.06, h * 0.045);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: p,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <Images it={it} resolve={resolve} size={{ width: "100%", flex: 1, minHeight: 0 }} />
      {it.badge && (
        <div style={{ marginTop: p * 0.4 }}>
          <Badge text={it.badge} fs={badgeFs} inverted={cell.inSidebar} />
        </div>
      )}
      <div
        style={{
          fontFamily: f.name,
          fontWeight: 800,
          fontSize: fs,
          lineHeight: 1,
          height: maxFs * 2,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: `${p * 0.5}px 0 ${p * 0.6}px`,
          color: "#111",
          textTransform: "uppercase",
          overflow: "hidden",
        }}
      >
        {name}
      </div>
      <div style={{ height: tagArea, display: "flex", alignItems: "center", flex: "none" }}>
        <PriceTag price={it.price} unit={it.unit} h={tagH} color={brand.colors.priceTag} font={f.price} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- ícones */

function PinIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}

function WhatsIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="16" fill="#25D366" />
      <path
        fill="#fff"
        d="M16 6.5a9.5 9.5 0 0 0-8.2 14.3L6.5 25.5l4.8-1.3A9.5 9.5 0 1 0 16 6.5zm0 17.3a7.8 7.8 0 0 1-4-1.1l-.3-.2-2.8.8.8-2.7-.2-.3A7.8 7.8 0 1 1 16 23.8zm4.3-5.8c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.8.9-.3.2-.5.1a6.4 6.4 0 0 1-3.2-2.8c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.7-1.7c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3z"
      />
    </svg>
  );
}

/* ---------------------------------------------------------------- página */

export interface PageInteraction {
  selectedSlot?: number | null;
  onSelect?: (index: number) => void;
  onDropSlot?: (index: number, e: DragEvent) => void;
  onDragStartSlot?: (index: number, e: DragEvent) => void;
}

export function FlyerPage({
  page,
  items,
  brand,
  resolve,
  interaction,
}: {
  page: Page;
  items: Record<string, Item>;
  brand: Brand;
  resolve: (r: string | null) => string;
  interaction?: PageInteraction;
}) {
  const def = TEMPLATES[page.template];
  const cs = cells(page.template);
  const f = FONTS[brand.font];
  const left = brand.logoSide === "left";
  const logoBox = { x: left ? 45 : PAGE_W - 380, y: 30, w: 335, h: 205 };
  const bannerBox = { x: left ? 415 : PAGE_W - 975, y: 20, w: 560, h: 375 };
  const vBox = { x: logoBox.x - 10, y: 245, w: logoBox.w + 20, h: 140 };
  const R = 40;

  return (
    <div
      style={{
        width: PAGE_W,
        height: PAGE_H,
        position: "relative",
        overflow: "hidden",
        background: brand.colors.bg,
        fontFamily: f.name,
      }}
    >
      {/* cabeçalho */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolve(brand.logo)}
        alt=""
        style={{ position: "absolute", left: logoBox.x, top: logoBox.y, width: logoBox.w, height: logoBox.h, objectFit: "contain" }}
      />
      <div
        style={{
          position: "absolute",
          left: vBox.x,
          top: vBox.y,
          width: vBox.w,
          height: vBox.h,
          color: brand.colors.headerText,
          textAlign: "center",
          textTransform: "uppercase",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 46, lineHeight: 1, letterSpacing: 0.5 }}>{brand.validityTitle}</div>
        <div style={{ fontWeight: 700, fontSize: 25, lineHeight: 1.1, marginTop: 8 }}>
          {brand.validityEnd ? `ATÉ ${brand.validityEnd} OU ENQUANTO` : "ENQUANTO"}
          <br />
          DURAREM OS ESTOQUES.
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolve(brand.banner)}
        alt=""
        style={{ position: "absolute", left: bannerBox.x, top: bannerBox.y, width: bannerBox.w, height: bannerBox.h, objectFit: "contain" }}
      />

      {/* painéis */}
      {def.sidebar > 0 && (
        <div
          style={{
            position: "absolute",
            left: SIDEBAR.x,
            top: AREA.y,
            width: SIDEBAR.w,
            height: AREA.h,
            borderRadius: R,
            background: brand.colors.sidebar,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: def.sidebar ? PANEL_L.x : AREA.x,
          top: AREA.y,
          width: def.sidebar ? PANEL_L.w : AREA.w,
          height: AREA.h,
          borderRadius: R,
          background: brand.colors.panel,
        }}
      />

      {/* produtos */}
      {cs.map((cell, i) => {
        const id = page.slots[i];
        const it = id ? items[id] : undefined;
        const selected = interaction?.selectedSlot === i;
        return (
          <div
            key={i}
            data-slot={i}
            draggable={!!(interaction && it)}
            onClick={interaction?.onSelect ? () => interaction.onSelect!(i) : undefined}
            onDragStart={interaction?.onDragStartSlot ? (e) => interaction.onDragStartSlot!(i, e) : undefined}
            onDragOver={interaction?.onDropSlot ? (e) => e.preventDefault() : undefined}
            onDrop={interaction?.onDropSlot ? (e) => interaction.onDropSlot!(i, e) : undefined}
            style={{
              position: "absolute",
              left: cell.x,
              top: cell.y,
              width: cell.w,
              height: cell.h,
              cursor: interaction ? "pointer" : undefined,
            }}
          >
            {it && <ProductCard it={it} cell={cell} brand={brand} resolve={resolve} />}
            {interaction && !it && (
              <div
                className="no-export"
                style={{
                  position: "absolute",
                  inset: 10,
                  border: "4px dashed rgba(0,0,0,.18)",
                  borderRadius: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(0,0,0,.3)",
                  fontSize: 28,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                vazio
              </div>
            )}
            {interaction && it?.imageGuess && (
              <div
                className="no-export"
                title="Imagem escolhida por semelhança: confira"
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  background: "#ff8a00",
                  color: "#fff",
                  borderRadius: 999,
                  width: 34,
                  height: 34,
                  fontSize: 24,
                  fontWeight: 900,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                ?
              </div>
            )}
            {selected && (
              <div
                className="no-export"
                style={{ position: "absolute", inset: 2, border: "6px solid #2563eb", borderRadius: 18, pointerEvents: "none" }}
              />
            )}
          </div>
        );
      })}

      {/* rodapé */}
      <div
        style={{
          position: "absolute",
          left: 52,
          right: 52,
          top: 1278,
          height: 62,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: brand.colors.headerText,
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <PinIcon size={50} color={brand.colors.sidebar} />
          <div style={{ fontSize: 23, lineHeight: 1.1 }}>
            {brand.addressLines[0]}
            <br />
            {brand.addressLines[1]}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <WhatsIcon size={50} />
          <div style={{ fontSize: 25, lineHeight: 1.1 }}>
            {brand.phones[0]}
            <br />
            {brand.phones[1]}
          </div>
        </div>
      </div>
    </div>
  );
}

/** página escalada para caber na tela (o nó interno continua 1080x1350 para exportar) */
export function ScaledPage({
  scale,
  children,
  innerRef,
}: {
  scale: number;
  children: React.ReactNode;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div style={{ width: PAGE_W * scale, height: PAGE_H * scale, position: "relative", flex: "none" }}>
      <div ref={innerRef} style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
        {children}
      </div>
    </div>
  );
}
