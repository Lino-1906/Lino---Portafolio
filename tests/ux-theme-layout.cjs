const { chromium } = require('./browser-runtime.cjs');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel:'chrome', headless:true });
  try {
    for (const name of ['cierum', 'giantucchi', 'pci-express']) {
      for (const width of [390, 1280]) {
        const page = await browser.newPage({ viewport:{ width, height:800 }, isMobile:width < 700, hasTouch:width < 700 });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('http://127.0.0.1:8000/' + name + '.html');
        if (name !== 'pci-express') {
          const expectedFont = name === 'cierum' ? 'Montserrat' : 'Inter';
          assert.match(await page.locator('body').evaluate(node => getComputedStyle(node).fontFamily), new RegExp(expectedFont), name + ': brand font');
          assert.match(await page.locator('h2').first().evaluate(node => getComputedStyle(node).fontFamily), new RegExp(expectedFont), name + ': heading font');
          assert.equal(await page.locator('.chapter-links a[href="#manual"]').count(), 1, name + ': manual nav');
          assert.equal(await page.locator('.brand-manual-reader iframe').count(), 1, name + ': interactive manual');
          await page.locator('.chapter-links a[href="#manual"]').click();
          await page.waitForTimeout(1100);
          const manual = await page.evaluate(() => ({
            active:document.querySelectorAll('.chapter-links [aria-current="location"]').length,
            labelTop:Math.round(document.querySelector('#manual .eyebrow').getBoundingClientRect().top),
            navBottom:Math.round(document.querySelector('.chapter-nav').getBoundingClientRect().bottom),
            readerLoaded:Boolean(document.querySelector('.brand-manual-reader iframe').contentDocument?.querySelector('#book.ready'))
          }));
          assert.equal(manual.active, 1, name + ': manual active links');
          assert.ok(manual.labelTop >= manual.navBottom, name + ': hidden manual title');
          assert.ok(manual.readerLoaded, name + ': reader not loaded');
          const manualLayout = await page.evaluate(() => {
            const copy = document.querySelector('.brand-manual-copy').getBoundingClientRect();
            const reader = document.querySelector('.brand-manual-reader').getBoundingClientRect();
            return { below:reader.top >= copy.bottom, copyWidth:copy.width, readerWidth:reader.width };
          });
          assert.ok(manualLayout.below, name + ': reader is not below copy');
          if (width > 760) assert.ok(manualLayout.readerWidth > manualLayout.copyWidth, name + ': reader is not full width');
          const reader = page.frameLocator('.brand-manual-reader iframe');
          await reader.locator('#nextBtn').click();
          await page.waitForTimeout(1100);
          const readerStatus = await reader.locator('#status').innerText();
          assert.match(readerStatus, width > 760 ? /PÁGINAS 2-3/i : /PÁGINA 2/i, name + ': wrong reader orientation');
          await page.screenshot({ path:'tmp/' + name + '-manual-' + width + '.png' });
        }
        await page.locator('.chapter-links a[href="#proceso"]').click();
        await page.waitForTimeout(1100);
        const state = await page.evaluate(() => {
          const cards = [...document.querySelectorAll('.process-grid article')];
          return {
            active:document.querySelectorAll('.chapter-links [aria-current="location"]').length,
            targetTop:Math.round(document.querySelector('#proceso').getBoundingClientRect().top),
            labelTop:Math.round(document.querySelector('#proceso .eyebrow').getBoundingClientRect().top),
            navBottom:Math.round(document.querySelector('.chapter-nav').getBoundingClientRect().bottom),
            cards:cards.length,
            themed:getComputedStyle(cards[0]).backgroundImage !== 'none'
          };
        });
        assert.equal(errors.length, 0, name + ': JS errors');
        assert.equal(state.active, 1, name + ': active links');
        assert.equal(state.cards, 3, name + ': cards');
        assert.ok(state.themed, name + ': cards lack theme');
        assert.ok(state.labelTop >= state.navBottom, name + ': hidden direct target ' + JSON.stringify(state));
        await page.screenshot({ path:'tmp/' + name + '-process-' + width + '.png' });
        console.log(name, width, 'PASS');
        await page.close();
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
