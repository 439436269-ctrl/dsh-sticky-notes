/**
 * Cross-version probe for dsh-sticky-notes against a DSH 0.2.2 host:
 * dismiss first-run overlays, open the sidebar entry, and report whether the
 * board mounted and its route answered. Not part of the shipped tests.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';

async function loadPlaywright() {
  const cacheRoot = join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'npm-cache', '_npx');
  const candidates = [join(process.cwd(), 'node_modules', 'playwright')];
  if (existsSync(cacheRoot)) for (const entry of readdirSync(cacheRoot)) candidates.push(join(cacheRoot, entry, 'node_modules', 'playwright'));
  for (const c of candidates) if (existsSync(c)) return import(pathToFileURL(join(c, 'index.mjs')).href);
  throw new Error('playwright not found');
}

const { chromium } = await loadPlaywright();
const base = process.argv[2];
const token = process.argv[3];
const browser = await chromium.launch({ headless: true, channel: process.env.E2E_BROWSER_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
await page.goto(`${base}/?token=${token}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);

for (let round = 0; round < 10; round += 1) {
  const clicked = await page.evaluate(() => {
    const labels = ['稍后配置', '暂不开启', '知道了', '保留当前显示', '跳过', '以后再说', '关闭', '继续', '结束', '明白了'];
    const inDialog = Array.from(document.querySelectorAll('[role="dialog"] button, dialog button, [role="presentation"] button'));
    const match = inDialog.find((el) => {
      const text = (el.innerText || '').replace(/\s+/g, '').trim();
      return labels.includes(text) && el.getBoundingClientRect().width > 0;
    });
    if (!match) return null;
    match.click();
    return (match.innerText || '').trim();
  });
  if (clicked === null) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(350); }
  else { await page.waitForTimeout(600); }
  const dialogs = await page.evaluate(() => document.querySelectorAll('[role="dialog"], dialog[open]').length);
  if (dialogs === 0) break;
}

const entry = await page.evaluate(() => {
  const el = document.querySelector('[aria-label="便签"]');
  if (!el) return false;
  el.click();
  return true;
});
await page.waitForTimeout(1500);
const panel = await page.evaluate(() => {
  const el = document.querySelector('[data-dsh-sticky-notes]');
  return el === null ? null : { text: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 120), status: el.getAttribute('data-status') };
});
const api = await page.evaluate(async () => {
  const r = await fetch('/api/dsh-notes', { headers: { accept: 'application/json' }, cache: 'no-store' });
  const body = await r.json().catch(() => null);
  return { status: r.status, ok: body?.ok === true };
});
await page.screenshot({ path: join(process.cwd(), 'scripts', 'shots', '20-dsh022-board.png') });
const scoped = errors.filter((e) => /sticky-notes|dsn-/.test(e));
console.log(JSON.stringify({ entryFound: entry, panel, api, errors: scoped, ambient: errors.filter((e) => !/sticky-notes|dsn-/.test(e)) }, null, 2));
await browser.close();
if (!entry || panel === null || !api.ok) process.exitCode = 1;
