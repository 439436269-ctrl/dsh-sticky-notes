/**
 * Headless end-to-end check for the sticky-notes board against a locally booted
 * web host: create a coloured, pinned note through the UI, change the grid
 * density, search, archive/restore through the trash, and prove everything
 * survives a reload.
 *
 * Usage:
 *   node scripts/e2e-notes.mjs --base http://127.0.0.1:PORT --token <token>
 */
import { existsSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** Resolve playwright from a local install, then from the npx cache. */
async function loadPlaywright() {
  const cacheRoot = join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "npm-cache", "_npx");
  const candidates = [
    process.env.PLAYWRIGHT_MODULE_DIR,
    join(process.cwd(), "node_modules", "playwright"),
    join(homedir(), "node_modules", "playwright")
  ].filter(Boolean);
  if (existsSync(cacheRoot)) {
    for (const entry of readdirSync(cacheRoot)) candidates.push(join(cacheRoot, entry, "node_modules", "playwright"));
  }
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    return import(pathToFileURL(join(candidate, "index.mjs")).href);
  }
  throw new Error("playwright not found; set PLAYWRIGHT_MODULE_DIR to a directory containing playwright/");
}

const { chromium } = await loadPlaywright();

function argument(name) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? undefined : process.argv[at + 1];
}

const base = argument("base");
const token = argument("token");
const outDir = argument("out") ?? join(process.cwd(), "scripts", "shots");
if (base === undefined) throw new Error("--base is required");
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true, channel: process.env.E2E_BROWSER_CHANNEL ?? "msedge" });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});

/** Clear the first-run overlays a fresh profile shows, without hitting masks. */
async function dismissOverlays() {
  const labels = ["暂不开启", "稍后配置", "知道了", "保留当前显示", "跳过", "以后再说", "结束", "继续"];
  for (let round = 0; round < 8; round += 1) {
    const clicked = await page.evaluate((wanted) => {
      const candidates = Array.from(document.querySelectorAll('button, [role="button"]'));
      const match = candidates.find((element) => {
        const text = (element.innerText || "").replace(/\s+/g, "").trim();
        return wanted.some((label) => text === label) && element.getBoundingClientRect().width > 0;
      });
      if (match === undefined) return null;
      match.click();
      return (match.innerText || "").trim();
    }, labels);
    if (clicked === null) {
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(300);
      const remaining = await page.evaluate(() => document.querySelectorAll('[role="dialog"], [role="dialog"][open]').length);
      if (remaining === 0) return;
      continue;
    }
    console.log(`dismissed: ${clicked}`);
    await page.waitForTimeout(700);
  }
}

/** Open the notes board from the sidebar. */
async function openBoard() {
  await page.getByRole("button", { name: "便签", exact: true }).first().click({ timeout: 5000 });
  await page.waitForTimeout(1200);
  const count = await page.locator("[data-dsh-sticky-notes]").count();
  if (count !== 1) throw new Error("the notes board did not mount");
}

const checks = {};
await page.goto(token === undefined ? base : `${base}/?token=${token}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);
await dismissOverlays();
await openBoard();
await dismissOverlays();

const board = page.locator("[data-dsh-sticky-notes]");
await page.screenshot({ path: join(outDir, "10-board-empty.png") });

// 1. Create a coloured, pinned note through the UI.
await page.getByRole("button", { name: /新建便签|New note/ }).first().click();
const dialog = page.locator('[role="dialog"]');
await dialog.waitFor({ timeout: 5000 });
await dialog.locator("input.dsn-dialog-title").fill("项目周报");
await dialog.locator("textarea.dsn-dialog-body").fill("本周完成：颜色、平铺、回收站。\n下周：导出。");
await dialog.locator('.dsn-swatch[data-color="mint"]').click();
await dialog.getByRole("button", { name: /置顶|^Pin$/ }).first().click();
await page.waitForTimeout(1500);
checks.saveState = await dialog.locator(".dsn-save").getAttribute("data-state");
checks.saveText = (await dialog.locator(".dsn-save").innerText()).trim();
await page.keyboard.press("Escape");
await page.waitForTimeout(700);

const mintCard = page.locator('.dsn-card[data-color="mint"]').first();
checks.cardColor = await mintCard.getAttribute("data-color");
checks.cardPinned = await mintCard.getAttribute("data-pinned");
checks.cardTitle = (await mintCard.locator(".dsn-card-title").innerText()).trim();

// 2. Seed two more colours straight through the route, so the board has variety.
await page.evaluate(async () => {
  const payloads = [
    { title: "买点东西", body: "牛奶、鸡蛋、面包。", color: "amber" },
    { title: "灵感", body: "把便签做成可以平铺的便签墙。", color: "sky" },
    { title: "待办", body: "- 回复邮件\n- 续费域名", color: "rose", pinned: false }
  ];
  for (const payload of payloads) {
    await fetch("/api/dsh-notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "create", ...payload })
    });
  }
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(5000);
await dismissOverlays();
await openBoard();
checks.cardCount = await board.locator(".dsn-card").count();
await page.screenshot({ path: join(outDir, "11-board.png") });

// 3. Grid density: "3 per row" must produce exactly three tracks.
await page.locator('select[aria-label="每行"], select[aria-label="Per row"]').selectOption("3");
await page.waitForTimeout(400);
checks.density = await board.locator(".dsn-board").getAttribute("data-density");
checks.columns = await board.locator(".dsn-board").evaluate((element) => {
  const template = getComputedStyle(element).gridTemplateColumns;
  return template.split(" ").filter((track) => track !== "").length;
});
await page.screenshot({ path: join(outDir, "12-grid-3.png") });

// 4. Search narrows the board and the empty state speaks.
await page.locator(".dsn-search").fill("周报");
await page.waitForTimeout(300);
checks.searchTitles = await board.locator(".dsn-card-title").allInnerTexts();
await page.locator(".dsn-search").fill("zzz-no-such-note");
await page.waitForTimeout(300);
checks.emptyText = (await board.locator(".dsn-empty").innerText()).trim();
await page.locator(".dsn-search").fill("");
await page.waitForTimeout(300);

// 5. Archive through the card action, look in the trash, restore.
const target = page.locator(".dsn-card", { hasText: "买点东西" }).first();
await target.hover();
await target.locator('button[aria-label="移到回收站"], button[aria-label="Move to trash"]').click();
await page.waitForTimeout(900);
checks.toast = (await page.locator(".dsn-toast").innerText().catch(() => "")).trim();
checks.afterArchive = await board.locator(".dsn-card").count();

await page.getByRole("tab", { name: /回收站|Trash/ }).click();
await page.waitForTimeout(500);
checks.trashCards = await board.locator(".dsn-card").count();
await page.screenshot({ path: join(outDir, "13-trash.png") });
await board.locator('.dsn-card button[aria-label="恢复"], .dsn-card button[aria-label="Restore"]').first().click();
await page.waitForTimeout(700);
checks.trashAfterRestore = await board.locator(".dsn-card").count();
await page.getByRole("tab", { name: /全部|^All/ }).click();
await page.waitForTimeout(500);
checks.allAfterRestore = await board.locator(".dsn-card").count();

// 6. Reload: colour, pin and content come back from the host store.
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(5000);
await dismissOverlays();
await openBoard();
checks.afterReloadTitles = await board.locator(".dsn-card-title").allInnerTexts();
checks.afterReloadPinned = await page.locator('.dsn-card[data-color="mint"]').first().getAttribute("data-pinned");
await page.screenshot({ path: join(outDir, "14-after-reload.png") });

const scopedErrors = errors.filter((entry) => /sticky-notes|dsn-/.test(entry));
const result = {
  checks,
  errors: scopedErrors,
  ambientErrors: errors.filter((entry) => !/sticky-notes|dsn-/.test(entry))
};
await writeFile(join(outDir, "result.json"), JSON.stringify(result, null, 2), "utf8");
console.log(`result: ${JSON.stringify(result)}`);

const failed = [];
if (checks.saveState !== "saved") failed.push("auto-save did not reach saved");
if (checks.cardColor !== "mint") failed.push("the card lost its colour");
if (checks.cardPinned !== "true") failed.push("the card lost its pin");
if (checks.cardCount !== 4) failed.push(`expected 4 seeded cards, saw ${checks.cardCount}`);
if (checks.density !== "3") failed.push("density select did not apply");
if (checks.columns !== 3) failed.push(`grid has ${checks.columns} tracks, expected 3`);
if (!checks.searchTitles.includes("项目周报") || checks.searchTitles.length !== 1) failed.push("search did not narrow to one card");
if (!checks.emptyText.includes("没有") && !checks.emptyText.includes("No note")) failed.push("the filtered empty state is missing");
if (checks.afterArchive !== 3) failed.push(`archive left ${checks.afterArchive} cards, expected 3`);
if (checks.trashCards !== 1) failed.push(`trash shows ${checks.trashCards} cards, expected 1`);
if (checks.allAfterRestore !== 4) failed.push(`restore left ${checks.allAfterRestore} cards, expected 4`);
if (!checks.afterReloadTitles.includes("项目周报")) failed.push("the note did not survive a reload");
if (checks.afterReloadPinned !== "true") failed.push("the pin did not survive a reload");
if (scopedErrors.length > 0) failed.push(`plugin console errors: ${scopedErrors.join(" | ")}`);

await browser.close();
if (failed.length > 0) {
  console.error(`FAILED: ${failed.join("; ")}`);
  process.exitCode = 1;
}
