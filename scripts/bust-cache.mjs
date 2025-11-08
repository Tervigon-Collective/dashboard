import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = 'out';
const CONFIG_PATH = 'staticwebapp.config.json';

const indexPath = path.join(OUT_DIR, 'index.html');
if (!fs.existsSync(indexPath)) {
  throw new Error(`Cannot find ${indexPath}. Run \`npm run build\` before busting cache.`);
}

if (!fs.existsSync(CONFIG_PATH)) {
  throw new Error(`Cannot find ${CONFIG_PATH}.`);
}

const buildId = Date.now().toString();
const newIndexName = `index-${buildId}.html`;
const newIndexPath = path.join(OUT_DIR, newIndexName);

fs.copyFileSync(indexPath, newIndexPath);

const configRaw = fs.readFileSync(CONFIG_PATH, 'utf-8');
const config = JSON.parse(configRaw);

config.navigationFallback = config.navigationFallback || {};
config.navigationFallback.rewrite = `/${newIndexName}`;

fs.writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);

const manifestPath = path.join(OUT_DIR, 'cache-bust.json');
const manifest = {
  buildId,
  generatedAt: new Date().toISOString(),
  navigationFallback: config.navigationFallback.rewrite,
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Cache bust applied. navigationFallback now rewrites to /${newIndexName}`);
