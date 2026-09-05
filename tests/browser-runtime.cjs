// Prefer a project installation; Codex's bundled runtime is an offline fallback.
const path = require('node:path');
const os = require('node:os');
try { module.exports = require('playwright'); }
catch (_) {
  try {
    module.exports = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
  } catch (_) {
    throw new Error('Instala Playwright para las pruebas de navegador: npm install --no-save playwright. También se necesita Google Chrome.');
  }
}
