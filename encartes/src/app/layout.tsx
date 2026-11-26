import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "@fontsource/anton/400.css";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Encartes · Mercado União",
  description: "Monte encartes de ofertas a partir da lista do mercado",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
