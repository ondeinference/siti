#!/usr/bin/env node
/**
 * Renders Play Store marketing graphics from HTML templates using Puppeteer.
 * Output: assets/aso/playstore/{01-chat,02-settings}-1080x1920.png + feature-graphic-1024x500.png
 *
 * Usage: node scripts/generate-playstore-graphics.mjs
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const templateDir = join(__dirname, 'playstore-templates');
const outDir = join(repoRoot, 'assets', 'aso', 'playstore');

mkdirSync(outDir, { recursive: true });

const targets = [
  {
    template: '01-chat.html',
    output: '01-chat-1080x1920.png',
    width: 1080,
    height: 1920,
  },
  {
    template: '02-settings.html',
    output: '02-settings-1080x1920.png',
    width: 1080,
    height: 1920,
  },
  {
    template: 'feature-graphic.html',
    output: 'feature-graphic-1024x500.png',
    width: 1024,
    height: 500,
  },
];

console.log('Launching browser…');
const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

for (const { template, output, width, height } of targets) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });

  const url = `file://${join(templateDir, template)}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 });

  // Wait a tick for any final layout reflow after font load
  await new Promise(r => setTimeout(r, 500));

  const outputPath = join(outDir, output);
  await page.screenshot({ path: outputPath, fullPage: false, type: 'png' });

  console.log(`✓ ${output}`);
  await page.close();
}

await browser.close();
console.log(`\nDone — files in assets/aso/playstore/`);
