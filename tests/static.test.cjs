const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createServer } = require('../scripts/serve.cjs');
const root = path.resolve(__dirname, '..');
const pages = fs.readdirSync(root).filter(file => file.endsWith('.html'));
test('El doblado no salta al recuperar un fotograma retrasado', () => {
  let callback, now = 0;
  const frames = [];
  const surface = { addEventListener() {}, removeEventListener() {} };
  const context = {
    window: { ...surface }, document: { ...surface, hidden: false },
    location: { origin: 'http://localhost' }, performance: { now: () => now },
    requestAnimationFrame(fn) { callback = fn; return 1; }, cancelAnimationFrame() {}
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/editorial-magazine/render-on-demand.js'), 'utf8'), context);
  const render = {
    animation: null, update() {},
    app: { getPageCollection: () => ({ getPages: () => [] }), destroy() {} },
    startAnimation() { this.animation = { startedAt: this.timer }; },
    render(time) { if (this.animation) frames.push(time - this.animation.startedAt); }
  };
  context.window.startPageFlipOnDemand(render);
  render.startAnimation();
  for (const time of [16, 32, 162, 178]) { now = time; callback(time); }
  assert.deepEqual(frames, [16, 32, 64, 80]);
});
test('HTML: scripts inline válidos, IDs únicos y recursos locales existentes', () => {
  for (const name of pages) {
    const html = fs.readFileSync(path.join(root, name), 'utf8');
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    // Dynamic modal templates are included: their IDs must also be unique.
    assert.equal(ids.length, new Set(ids).size, name + ': IDs repetidos');
    for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (!/type=["'](?:importmap|application\/ld\+json|module)/.test(match[1])) {
        assert.doesNotThrow(() => new vm.Script(match[2]), name + ': script inline');
      }
    }
    for (const match of html.matchAll(/\b(?:src|href)=["']([^"'<>]+)["']/g)) {
      const value = match[1];
      if (/^(?:#|https?:|data:|javascript:|mailto:|tel:|about:)/.test(value) || value.includes('$') || !value) continue;
      const local = decodeURIComponent(value.split(/[?#]/)[0]);
      assert.ok(fs.existsSync(path.resolve(root, local)), name + ': ' + local);
    }
  }
});
test('Un solo controlador de capítulos', () => {
  for (const file of ['lumine','circuito','ayacucho','arte-culinario']) {
    assert.ok(!fs.readFileSync(path.join(root,'assets/js',file+'-case.js'),'utf8').includes("setAttribute('aria-current'"));
  }
});
test('Servidor: HTML, compresión, revalidación, rangos y privacidad', async () => {
  const server = createServer(root);
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const response = await fetch(base+'/index.html');
    assert.equal(response.status,200);
    assert.ok((await response.text()).includes('PORTA'));
    assert.equal((await fetch(base+'/index.html',{headers:{'If-None-Match':response.headers.get('etag')}})).status,304);
    const range = await fetch(base+'/index.html',{headers:{Range:'bytes=0-15'}});
    assert.equal(range.status,206);
    assert.equal((await range.arrayBuffer()).byteLength,16);
    assert.equal((await fetch(base+'/.git/config')).status,403);
    assert.equal((await fetch(base+'/tmp/private.html')).status,403);
  } finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
});
