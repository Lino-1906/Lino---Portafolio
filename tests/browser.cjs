const { chromium } = require('./browser-runtime.cjs');
const { createServer } = require('../scripts/serve.cjs');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const pages = ['lumine','circuito','ayacucho','arte-culinario','herbi','crafters','cierum','giantucchi','pci-express'];
(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel:'chrome', headless:true });
  const results = [];
  fs.mkdirSync('tmp/verification',{recursive:true});
  try {
    for (const width of [390,1280]) {
      const context = await browser.newContext({viewport:{width,height:900},hasTouch:width<700,isMobile:width<700});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base + (width<700?'/mobile.html':'/index.html'));
      await page.locator('.project-category-menu').waitFor();
      for (const hash of ['#proyectos-uxui','#proyectos-editorial','#proyectos-packaging','#proyectos-identidad']) {
        await page.locator('.project-category-menu a[href="'+hash+'"]').click();
        await page.waitForTimeout(1200);
        const geometry = await page.evaluate(hash => {
          const target = document.querySelector(hash).getBoundingClientRect();
          const menu = document.querySelector('.project-category-menu').getBoundingClientRect();
          return {top:target.top,bottom:menu.bottom};
        },hash);
        assert.ok(geometry.top >= geometry.bottom-2, 'Categoría oculta: '+JSON.stringify({width,hash,...geometry}));
      }
      await page.screenshot({path:'tmp/verification/home-'+width+'.png'});
      await page.evaluate(()=>openContactModal());
      assert.equal(await page.locator('[role="dialog"][aria-hidden="false"]').count(),1);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('[role="dialog"][aria-hidden="false"]').count(),0);
      for (const name of pages) {
        await page.goto(base+'/'+name+'.html');
        await page.locator('.chapter-links, .case-nav-inner').waitFor();
        const links = page.locator('.chapter-links a, .case-nav-inner a');
        const count = await links.count();
        for (const index of [count-1,1,0]) {
          await links.nth(index).click();
          await page.waitForFunction(() => !document.querySelector('.is-direct-navigation'), {timeout:6000});
          const geometry = await page.evaluate(() => {
            const nav = document.querySelector('.chapter-links, .case-nav-inner');
            const active = nav.querySelectorAll('[aria-current="location"]');
            const target = document.querySelector(location.hash);
            const label = target.querySelector('.chapter-kicker, .eyebrow, h2, h1') || target;
            const header = document.querySelector('.site-header').getBoundingClientRect();
            const bar = (nav.closest('nav')||nav).getBoundingClientRect();
            return {count:active.length,hash:active[0]?.hash,top:label.getBoundingClientRect().top,bottom:bar.top <= header.bottom+2 ? bar.bottom : header.bottom};
          });
          assert.equal(geometry.count,1,name+': selección única');
          assert.equal(geometry.hash,await links.nth(index).getAttribute('href'),name+': destino seleccionado');
          assert.ok(geometry.top >= geometry.bottom-2,name+': título oculto '+JSON.stringify(geometry));
        }
        await page.screenshot({path:'tmp/verification/'+name+'-'+width+'.png'});
      }
      assert.deepEqual(errors,[], 'Errores JS: '+width);
      results.push({width,pages:pages.length+1,status:'passed'});
      await context.close();
    }
    for (const name of ['lumine','circuito','ayacucho','editorial']) {
      const context = await browser.newContext({viewport:{width:390,height:600},isMobile:true,hasTouch:true});
      const page = await context.newPage(), requests = new Set();
      page.on('request', request => { if (/page-\d+\.jpg/.test(request.url())) requests.add(request.url()); });
      await page.goto(base+'/assets/'+name+'-magazine/reader.html');
      await page.locator('#book.ready').waitFor();
      await page.waitForTimeout(250);
      assert.ok(requests.size <= 7,'Carga inicial no diferida: '+name+' '+requests.size);
      const button = await page.locator('#nextBtn').boundingBox();
      assert.ok(button.width >= 44 && button.height >= 44);
      assert.equal(await page.locator('#soundBtn').getAttribute('aria-pressed'),'false');
      await page.locator('#nextBtn').click();
      await page.waitForTimeout(1000);
      assert.match(await page.locator('#status').innerText(), /2/);
      await page.screenshot({path:'tmp/verification/reader-'+name+'.png'});
      results.push({reader:name,initialPages:requests.size,status:'passed'});
      await context.close();
    }
    console.log(JSON.stringify(results,null,2));
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode=1; });
