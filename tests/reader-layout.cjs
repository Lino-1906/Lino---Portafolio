const assert = require('node:assert/strict');
const { chromium } = require('./browser-runtime.cjs');
const { createServer } = require('../scripts/serve.cjs');
(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const name of ['lumine', 'circuito', 'ayacucho', 'editorial']) {
      for (const width of [390, 800, 1280]) {
        const page = await browser.newPage({ viewport: { width, height: 500 } });
        await page.goto('http://127.0.0.1:' + server.address().port + '/assets/' + name + '-magazine/reader.html');
        await page.locator('#book.ready').waitFor();
        await page.waitForTimeout(400);
        for (const state of ['cover', 'open']) {
          if (state === 'open') {
            await page.locator('#nextBtn').click();
            await page.waitForTimeout(1100);
          }
          const layout = await page.evaluate(() => {
            const stage = document.querySelector('.stage').getBoundingClientRect();
            const hint = document.querySelector('.hint');
            const rect = hint.getBoundingClientRect();
            const controls = document.querySelector('.controls').getBoundingClientRect();
            return {
              hidden: getComputedStyle(hint).display === 'none',
              separate: rect.top >= stage.bottom - 1 && rect.bottom <= controls.top + 1,
              fits: controls.bottom <= innerHeight + 1 && controls.top >= stage.bottom - 1
            };
          });
          assert.equal(layout.hidden, width <= 700, name + ': mobile hint');
          assert.ok(layout.hidden || layout.separate, name + ': overlapping hint');
          assert.ok(layout.fits, name + ': cropped controls');
        }
        await page.screenshot({ path: 'tmp/' + name + '-layout-' + width + '.png' });
        console.log(name, width, 'PASS');
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
