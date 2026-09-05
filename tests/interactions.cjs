const {chromium}=require('./browser-runtime.cjs');
const {createServer}=require('../scripts/serve.cjs');
const assert=require('node:assert/strict');
(async()=>{
  const server=createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const context=await browser.newContext({viewport:{width:390,height:850},isMobile:true,hasTouch:true});
    const page=await context.newPage();
    await page.goto(base+'/mobile.html');
    await page.locator('#hamburger').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#hamburger').getAttribute('aria-expanded'),'false');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'hamburger');
    await page.locator('#hamburger').click();
    await page.locator('#menu-contacto').click();
    const dialog=page.locator('#m-contact-modal-overlay');
    await page.keyboard.press('Tab');
    assert.ok(await dialog.evaluate(node=>node.contains(document.activeElement)));
    await page.keyboard.press('Escape');
    assert.equal(await dialog.getAttribute('aria-hidden'),'true');
    assert.ok(await page.evaluate(()=>!document.body.querySelector('main').inert));
    const photos=page.locator('.photography-project-grid');
    await photos.scrollIntoViewIfNeeded();
    await page.evaluate(()=>scrollBy({top:100,behavior:'instant'}));
    const rect=await photos.boundingBox();
    const cdp=await context.newCDPSession(page);
    async function swipe(x,y,dx,dy) {
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      for(let i=1;i<=12;i++) {
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/12,y:y+dy*i/12}]});
        await page.waitForTimeout(16);
      }
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await page.waitForTimeout(600);
    }
    const touchY=Math.max(220,Math.min(650,rect.y+200));
    const before=await page.evaluate(()=>scrollY);
    await swipe(195,touchY,0,-150);
    await page.screenshot({path:'tmp/verification/photo-gesture.png'});
    assert.ok((await page.evaluate(()=>scrollY))>before+30,'El gesto vertical sobre fotografía debe desplazar la página');
    await photos.scrollIntoViewIfNeeded();
    const newRect=await photos.boundingBox();
    const left=await photos.evaluate(node=>node.scrollLeft);
    await swipe(300,Math.max(240,Math.min(650,newRect.y+180)),-210,0);
    assert.ok((await photos.evaluate(node=>node.scrollLeft))>left+30,'El gesto horizontal debe avanzar fotografía');
    console.log('Gestos fotografía, menú y foco: OK');
    await context.close();
    const reduced=await browser.newContext({viewport:{width:390,height:850},reducedMotion:'reduce'});
    const reducedPage=await reduced.newPage();
    await reducedPage.goto(base+'/mobile.html');
    assert.equal(await reducedPage.locator('h1').evaluate(node=>getComputedStyle(node).opacity),'1');
    await reduced.close();
    console.log('Movimiento reducido: OK');
  } finally {await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
