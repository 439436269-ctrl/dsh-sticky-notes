/**
 * Visual comparison pass: screenshot the shipped Plugins page and the notes
 * panel in the same window so the panel's surface treatment can be judged
 * against a native page, not in isolation.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

async function loadPlaywright() {
  const cacheRoot = join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "npm-cache", "_npx");
  const candidates = [process.env.PLAYWRIGHT_MODULE_DIR, join(process.cwd(), "node_modules", "playwright")].filter(Boolean);
  if (existsSync(cacheRoot)) {
    for (const entry of readdirSync(cacheRoot)) candidates.push(join(cacheRoot, entry, "node_modules", "playwright"));
  }
  for (const candidate of candidates) {
    if (existsSync(candidate)) return import(pathToFileURL(join(candidate, "index.mjs")).href);
  }
  throw new Error("playwright not found");
}

const { chromium } = await loadPlaywright();
const base = process.argv[2];
const token = process.argv[3];
const out = join(process.cwd(), "scripts", "shots");
const browser = await chromium.launch({ headless: true, channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${base}/?token=${token}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);

for (let round = 0; round < 8; round += 1) {
  const clicked = await page.evaluate(() => {
    const labels = ["暂不开启", "稍后配置", "知道了", "保留当前显示", "结束", "继续"];
    const match = Array.from(document.querySelectorAll('button, [role="button"]')).find((element) => {
      const text = (element.innerText || "").replace(/\s+/g, "").trim();
      return labels.includes(text) && element.getBoundingClientRect().width > 0;
    });
    if (match === undefined) return null;
    match.click();
    return (match.innerText || "").trim();
  });
  if (clicked === null) break;
  await page.waitForTimeout(600);
}

await page.getByRole("button", { name: "插件", exact: true }).first().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: join(out, "10-plugins-page.png") });
const pluginsPaint = await page.evaluate(() => {
  const hit = document.elementFromPoint(700, 450);
  const chain = [];
  for (let node = hit; node !== null && chain.length < 6; node = node.parentElement) {
    const style = getComputedStyle(node);
    chain.push({ tag: node.tagName, cls: node.className && String(node.className).slice(0, 40), bg: style.backgroundColor });
  }
  return chain;
});
console.log(`plugins paint chain: ${JSON.stringify(pluginsPaint)}`);

await page.getByRole("button", { name: "便签", exact: true }).first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: join(out, "11-notes-page.png") });
const notesPaint = await page.evaluate(() => {
  const hit = document.elementFromPoint(700, 450);
  const chain = [];
  for (let node = hit; node !== null && chain.length < 6; node = node.parentElement) {
    const style = getComputedStyle(node);
    chain.push({ tag: node.tagName, cls: node.className && String(node.className).slice(0, 40), bg: style.backgroundColor });
  }
  return chain;
});
console.log(`notes paint chain: ${JSON.stringify(notesPaint)}`);

const sizes = await page.evaluate(() => {
  const panel = document.querySelector("[data-dsh-sticky-notes]");
  const header = document.querySelector(".dsn-header");
  const list = document.querySelector(".dsn-list");
  const editor = document.querySelector(".dsn-editor");
  const box = (node) => (node === null ? null : node.getBoundingClientRect().toJSON());
  return { panel: box(panel), header: box(header), list: box(list), editor: box(editor) };
});
console.log(`sizes: ${JSON.stringify(sizes)}`);
await browser.close();
