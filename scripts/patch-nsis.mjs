import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const target = require.resolve('app-builder-lib/out/targets/nsis/NsisTarget.js');

let src = readFileSync(target, 'utf8');
const needle = 'if ((0, macosVersion_1.isMacOsCatalina)()) {';
const patched = 'if (true) { // patched: extract uninstaller without executing installer (no wine)';

if (src.includes(patched)) {
  console.log('[patch-nsis] ya aplicado');
} else if (src.includes(needle)) {
  writeFileSync(target, src.replace(needle, patched));
  console.log('[patch-nsis] NsisTarget.js parcheado: desinstalador extraído sin wine');
} else {
  console.warn('[patch-nsis] patrón no encontrado; electron-builder puede requerir wine');
}
