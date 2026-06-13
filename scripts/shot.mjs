// Chup man hinh cac route de Claude xem & cai thien UI/UX.
// Dung: node scripts/shot.mjs [route1 route2 ...]   (mac dinh: "/")
// Yeu cau dev server dang chay o BASE (mac dinh http://localhost:3000).
// Anh luu vao .screenshots/<route>-<viewport>.png
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['/'];
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const slug = (r) => (r === '/' ? 'home' : r.replace(/^\/+|\/+$/g, '').replace(/\//g, '-'));

await mkdir('.screenshots', { recursive: true });
const browser = await chromium.launch();
try {
  for (const route of routes) {
    for (const vp of viewports) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      const url = `${BASE}${route}`;
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        const out = `.screenshots/${slug(route)}-${vp.name}.png`;
        await page.screenshot({ path: out, fullPage: true });
        console.log(`OK  ${url} [${vp.name}] -> ${out}`);
      } catch (err) {
        console.error(`ERR ${url} [${vp.name}]: ${err.message}`);
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
