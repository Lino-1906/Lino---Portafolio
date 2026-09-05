const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('./browser-runtime.cjs');

(async () => {
  const browser = await chromium.launch({ channel:'chrome', headless:true });
  try {
    for (const config of [
      { name:'cierum', pages:28 },
      { name:'giantucchi', pages:15 }
    ]) {
      for (let index = 1; index <= config.pages; index++) {
        assert.ok(fs.existsSync(path.join(__dirname, '..', 'assets', 'brand-manuals', config.name, `page-${String(index).padStart(2, '0')}.jpg`)), `${config.name}: missing page ${index}`);
      }
      for (const width of [390, 1280]) {
        const page = await browser.newPage({ viewport:{ width, height:620 }, isMobile:width < 700, hasTouch:width < 700 });
        const errors = [], images = new Set();
        page.on('pageerror', error => errors.push(error.message));
        page.on('request', request => { if (/brand-manuals\/.+\/page-\d+\.jpg/.test(request.url())) images.add(request.url()); });
        await page.goto(`http://127.0.0.1:8000/assets/brand-manuals/${config.name}-reader.html`);
        await page.locator('#book.ready').waitFor();
        await page.waitForTimeout(350);
        assert.ok(images.size <= 7, `${config.name}: eager loading ${images.size}`);
        assert.equal(errors.length, 0, `${config.name}: JS errors`);
        assert.match(await page.locator('#status').innerText(), new RegExp(`1.+${config.pages}`), `${config.name}: initial status`);
        await page.locator('#nextBtn').click();
        await page.waitForTimeout(1100);
        assert.match(await page.locator('#status').innerText(), new RegExp(`2.+${config.pages}`), `${config.name}: next page`);
        const controls = await page.locator('.controls').boundingBox();
        assert.ok(controls.y + controls.height <= 621, `${config.name}: cropped controls`);
        await page.screenshot({ path:`tmp/${config.name}-interactive-${width}.png` });
        console.log(config.name, width, images.size, 'PASS');
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
