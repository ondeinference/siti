#!/usr/bin/env node
/**
 * Renders App Store visionOS screenshots from HTML templates using Puppeteer.
 * Apple requires exactly 3840x2160 for Apple Vision Pro screenshots (verify
 * against the App Store Connect upload panel at build time — see
 * assets/aso/appstore/shared.md and the app-store-optimization skill).
 *
 * Output: assets/aso/appstore/visionos/{01-chat,02-settings}-3840x2160.png
 *
 * Usage: node scripts/generate-visionos-graphics.mjs
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const templateDir = join(__dirname, 'appstore-templates');
const outDir = join(repoRoot, 'assets', 'aso', 'appstore', 'visionos');

mkdirSync(outDir, { recursive: true });

const WIDTH = 3840;
const HEIGHT = 2160;

const targets = [
  { template: '01-chat.html', output: '01-chat-3840x2160.png' },
  { template: '02-settings.html', output: '02-settings-3840x2160.png' },
];

console.log('Launching browser…');
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

for (const { template, output } of targets) {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

  const url = `file://${join(templateDir, template)}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 });

  // Wait a tick for any final layout reflow after font load
  await new Promise(r => setTimeout(r, 500));

  const outputPath = join(outDir, output);
  // App Store Connect rejects screenshots with an alpha channel — omitOmitBackground
  // (default) plus a fully opaque .page background keeps the PNG opaque.
  await page.screenshot({ path: outputPath, fullPage: false, type: 'png' });

  console.log(`✓ ${output}`);
  await page.close();
}

await browser.close();
console.log(`\nDone — files in assets/aso/appstore/visionos/`);
