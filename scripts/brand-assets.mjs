/**
 * Gera os ícones e o splash do ParkSmart a partir do logótipo vetorial.
 * Uso: node scripts/brand-assets.mjs  (precisa do Playwright; se estiver instalado globalmente:
 *   PLAYWRIGHT_MODULE=$(npm root -g)/playwright/index.js node scripts/brand-assets.mjs)
 * Os SVG de origem ficam em design/brand/.
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright'));
}

// Marca: pino de localização branco com um "P" recortado, sobre um degradê índigo.
const PIN = 'M50 86 C47 82 23 61 23 41 A27 27 0 1 1 77 41 C77 61 53 82 50 86 Z';
const P = 'M40.5 27 H52.5 A10.5 10.5 0 0 1 52.5 48 H48 V56.5 H40.5 Z M48 33.5 V41.5 H52 A4 4 0 0 0 52 33.5 Z';
const GRAD = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5B7CFF"/><stop offset="1" stop-color="#2335C9"/></linearGradient>`;

/** Símbolo (pino + P) centrado num quadro 100x100, escalado por `s`. */
const mark = (s = 1, pFill = '#2F47E0', pin = '#FFFFFF') => `
  <g transform="translate(50 50) scale(${s}) translate(-50 -50)">
    <ellipse cx="50" cy="88" rx="11" ry="2.6" fill="#000" opacity="0.18"/>
    <path d="${PIN}" fill="${pin}"/>
    <path d="${P}" fill="${pFill}" fill-rule="evenodd"/>
    <circle cx="67.5" cy="22.5" r="4.2" fill="#2BD9AE" stroke="${pin}" stroke-width="2.4"/>
  </g>`;

const svg = (body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs>${GRAD}${defs}</defs>${body}</svg>`;

const files = {
  // iOS / Expo icon: quadrado cheio (o sistema arredonda os cantos)
  'icon.png': [1024, svg(`<rect width="100" height="100" fill="url(#g)"/>${mark(0.78)}`)],
  // Android adaptive: o sistema recorta ~66% centrais
  'android-icon-foreground.png': [1024, svg(mark(0.5))],
  'android-icon-background.png': [1024, svg(`<rect width="100" height="100" fill="url(#g)"/>`)],
  'android-icon-monochrome.png': [1024, svg(`<g transform="translate(50 50) scale(0.5) translate(-50 -50)"><path d="${PIN} ${P}" fill="#000" fill-rule="evenodd"/></g>`)],
  // splash: azulejo arredondado sobre fundo escuro (definido no app.json)
  'splash-icon.png': [1024, svg(`<rect x="6" y="6" width="88" height="88" rx="24" fill="url(#g)"/>${mark(0.66)}`)],
  'favicon.png': [64, svg(`<rect width="100" height="100" rx="24" fill="url(#g)"/>${mark(0.8)}`)],
};

writeFileSync(join(root, 'design/brand/logo-mark.svg'), svg(`<rect width="100" height="100" rx="24" fill="url(#g)"/>${mark(0.78)}`));

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, [size, source]] of Object.entries(files)) {
  const sized = source.replace('width="100" height="100"', `width="${size}" height="${size}"`);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${sized}</body></html>`);
  await page.locator('svg').screenshot({ path: join(root, 'assets', name), omitBackground: true });
  console.log('assets/' + name);
}
await browser.close();
