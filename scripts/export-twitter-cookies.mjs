import path from 'node:path';
import { Page } from '../.opencli-global/node_modules/@jackwener/opencli/dist/browser/page.js';
import { exportCookiesToNetscape } from '../.opencli-global/node_modules/@jackwener/opencli/dist/download/index.js';

const outPath = path.resolve(process.argv[2] || './downloads/twitter_cookies.txt');
const page = new Page(`twitter-cookies-${Date.now()}`);

try {
  await page.goto('https://x.com/home', { settleMs: 3000 });
  await page.wait(2);
  const cookies = await page.getCookies({ domain: 'x.com' });
  exportCookiesToNetscape(cookies, outPath);
  console.log(outPath);
} finally {
  await page.closeWindow();
}
