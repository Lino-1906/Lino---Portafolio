const { chromium } = require('./browser-runtime.cjs');
const { createServer } = require('../scripts/serve.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const pages = ['index','lumine','circuito','ayacucho','arte-culinario','herbi','crafters','cierum','giantucchi','pci-express'];
async function serve(root) {
  const server = createServer(root);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {server,base:'http://127.0.0.1:'+server.address().port};
}
(async()=>{
  const current = await serve();
  const baseline = process.env.BASELINE_ROOT ? await serve(process.env.BASELINE_ROOT) : null;
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const report = {responsive:[],readers:[],models:[],baseline:[]};
  fs.mkdirSync('tmp/verification',{recursive:true});
  try {
    const social = await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
    await social.goto(current.base+'/assets/social-card.html');
    await social.evaluate(()=>document.fonts.ready);
    await social.screenshot({path:'assets/social-preview.png'});
    await social.close();
    for (const width of [360,430,768,1024]) {
      const context = await browser.newContext({viewport:{width,height:850},isMobile:width<=768,hasTouch:width<=768});
      const page = await context.newPage(), errors = [];
      page.on('pageerror',error=>errors.push(error.message));
      for (const name of pages) {
        await page.goto(current.base+'/'+(name==='index'&&width<=768?'mobile':name)+'.html');
        await page.evaluate(()=>document.fonts.ready);
        assert.ok(await page.locator('h1').count(),name+': h1');
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth+1),name+': overflow '+width);
        if (['cierum','giantucchi','pci-express'].includes(name)) {
          await page.locator('.chapter-links a[href="#resultado"]').click();
          await page.waitForFunction(()=>!document.querySelector('.is-direct-navigation'));
          assert.equal(await page.locator('.chapter-links [aria-current="location"]').getAttribute('href'),'#resultado');
          await page.screenshot({path:'tmp/verification/'+name+'-'+width+'.png'});
        }
      }
      assert.deepEqual(errors,[], 'JS '+width);
      report.responsive.push({width,pages:pages.length,status:'passed'});
      console.log('Responsive '+width+': OK');
      await context.close();
    }
    for (const [name,stageId,spinId,readyClass] of [['herbi','viewer-stage','box-spin','viewer-ready'],['crafters','acrylic-stage','acrylic-spin','is-ready']]) {
      const page = await browser.newPage({viewport:{width:1280,height:900}});
      await page.addInitScript(()=>{
        window.drawCalls=0;
        for(const type of [window.WebGLRenderingContext,window.WebGL2RenderingContext]) {
          if(!type) continue;
          for(const method of ['drawArrays','drawElements']) {
            const original=type.prototype[method];
            type.prototype[method]=function(...args){window.drawCalls++;return original.apply(this,args);};
          }
        }
      });
      await page.goto(current.base+'/'+name+'.html');
      await page.locator('#'+stageId).scrollIntoViewIfNeeded();
      await page.locator('#'+stageId+'.'+readyClass).waitFor({timeout:30000});
      const spin = page.locator('#'+spinId);
      await spin.click();
      await page.waitForTimeout(1500);
      const pausedBefore=await page.evaluate(()=>window.drawCalls);
      await page.waitForTimeout(500);
      const paused=(await page.evaluate(()=>window.drawCalls))-pausedBefore;
      assert.equal(paused,0,name+': dibuja estando pausado');
      await spin.click();
      const movingBefore=await page.evaluate(()=>window.drawCalls);
      await page.waitForTimeout(500);
      const moving=(await page.evaluate(()=>window.drawCalls))-movingBefore;
      assert.ok(moving>0,name+': no gira');
      await page.screenshot({path:'tmp/verification/model-'+name+'.png'});
      await page.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
      await page.waitForTimeout(500);
      const hiddenBefore=await page.evaluate(()=>window.drawCalls);
      await page.waitForTimeout(500);
      const hidden=(await page.evaluate(()=>window.drawCalls))-hiddenBefore;
      assert.equal(hidden,0,name+': dibuja fuera de pantalla');
      report.models.push({name,paused,moving,hidden});
      console.log('Modelo '+name+': OK');
      await page.close();
    }
    for (const width of [390,900]) {
      for (const name of ['lumine','circuito','ayacucho','editorial']) {
        const context = await browser.newContext({viewport:{width,height:650},isMobile:width===390,hasTouch:width===390});
        const page = await context.newPage(), requests=new Set(), errors=[];
        page.on('request',request=>{if(/page-\d+\.jpg/.test(request.url()))requests.add(request.url());});
        page.on('pageerror',error=>errors.push(error.message));
        await page.goto(current.base+'/assets/'+name+'-magazine/reader.html');
        await page.locator('#book.ready').waitFor();
        await page.waitForTimeout(300);
        const initial=requests.size;
        if(width===390) {
          await page.locator('#status').click();
          await page.waitForTimeout(500);
          assert.ok(await page.locator('#stage').evaluate(node=>node.classList.contains('zoomed')));
          await page.screenshot({path:'tmp/verification/zoom-'+name+'.png'});
          await page.locator('#status').click();
        }
        await page.keyboard.press('End');
        await page.waitForTimeout(700);
        const total=await page.locator('html').getAttribute('data-page-count');
        assert.ok((await page.locator('#status').innerText()).includes(total));
        await page.keyboard.press('Home');
        await page.waitForTimeout(700);
        assert.match(await page.locator('#status').innerText(),/1/);
        assert.deepEqual(errors,[]);
        report.readers.push({name,width,initial,afterJump:requests.size,status:'passed'});
        await context.close();
      }
    }
    if(baseline) {
      for(const version of [baseline,current]) {
        const page=await browser.newPage({viewport:{width:1280,height:900}});
        await page.goto(version.base+'/index.html');
        await page.evaluate(()=>document.fonts.ready);
        await page.waitForTimeout(1000);
        const heading=await page.locator('.poster-main-grid').boundingBox();
        await page.screenshot({path:'tmp/verification/hero-'+(version===baseline?'before':'after')+'.png'});
        report.baseline.push({version:version===baseline?'before':'after',heading});
        await page.close();
      }
      for(const version of [baseline,current]) {
        const page=await browser.newPage({viewport:{width:390,height:650}});
        await page.goto(version.base+'/assets/lumine-magazine/reader.html');
        await page.locator('#book.ready').waitFor();
        await page.waitForTimeout(1000);
        report.baseline.push({version:version===baseline?'before':'after',reader:await page.evaluate(()=>{
          const resources=performance.getEntriesByType('resource').filter(item=>/page-\d+\.jpg/.test(item.name));
          return {pages:resources.length,bytes:resources.reduce((sum,item)=>sum+item.encodedBodySize,0)};
        })});
        await page.close();
      }
    }
    console.log(JSON.stringify(report,null,2));
    fs.writeFileSync('tmp/verification/report.json',JSON.stringify(report,null,2));
  } finally {
    await browser.close();
    for(const {server} of [current,baseline].filter(Boolean)) {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
