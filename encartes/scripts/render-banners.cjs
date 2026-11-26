// Gera os banners de exemplo (PNG transparente 1120x750 = 2x a área 560x375) com a fonte Anton.
// Uso: node scripts/render-banners.cjs   (precisa do Playwright instalado)
const { chromium } = require("playwright");
const { readFileSync } = require("fs");
const { join } = require("path");

const font = readFileSync(join(__dirname, "../node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2")).toString("base64");
const css = `@font-face{font-family:A;src:url(data:font/woff2;base64,${font})}
*{margin:0;box-sizing:border-box}body{width:560px;height:375px;background:transparent;font-family:A;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;line-height:.9}`;

const banners = {
  "banner-black-friday": `
    <div style="color:#fff;font-size:150px;letter-spacing:4px;text-shadow:0 6px 0 #333">BLACK</div>
    <div style="background:linear-gradient(#ffe14d,#ffb300);color:#000;font-size:128px;padding:8px 36px 0;border-radius:24px;margin-top:6px;transform:rotate(-3deg);box-shadow:0 8px 0 #8a5a00">FRIDAY</div>`,
  "banner-fim-de-semana": `
    <div style="color:#fff;font-size:82px">OFERTAS DE</div>
    <div style="background:#ffd200;color:#c00000;font-size:104px;padding:14px 30px 4px;border-radius:26px;margin-top:10px">FIM DE<br>SEMANA</div>`,
  "banner-aniversario": `
    <div style="color:#ffd200;font-size:108px">ANIVERSÁRIO</div>
    <div style="background:#c00000;color:#fff;font-size:118px;padding:10px 40px 0;border-radius:26px;margin-top:12px">UNIÃO</div>`,
};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 560, height: 375 }, deviceScaleFactor: 2 });
  for (const [name, html] of Object.entries(banners)) {
    await p.setContent(`<style>${css}</style>${html}`);
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: join(__dirname, "../public/brand", name + ".png"), omitBackground: true });
    console.log(name);
  }
  await b.close();
})();
