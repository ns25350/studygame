import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
try {
  mkdirSync('public/icons', { recursive: true });
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const svg = readFileSync('public/icon.svg', 'utf8');
  for (const size of [192, 512]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>html,body{margin:0;width:100%;height:100%;background:#101c2b}svg{width:100%;height:100%}</style>${svg}`,
    );
    await page.screenshot({ path: `public/icons/icon-${size}.png` });
  }
  await page.setContent(
    `<style>html,body{margin:0;width:100%;height:100%;background:#101c2b;display:grid;place-items:center}svg{width:78%;height:78%}</style>${svg}`,
  );
  await page.screenshot({ path: 'public/icons/maskable-512.png' });
} finally {
  await browser.close();
}
