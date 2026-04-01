import { Page } from '../dist/browser/page.js';

const username = process.argv[2] || 'instagram';
const page = new Page(`ig-page-${Date.now()}`);

try {
  await page.goto(`https://www.instagram.com/${username}/`, { settleMs: 4000 });
  await page.wait(2);
  const data = await page.evaluate(`
    () => ({
      anchors: Array.from(document.querySelectorAll('a[href^="/p/"], a[href^="/reel/"]'))
        .slice(0, 20)
        .map((a) => a.getAttribute('href')),
      ldJson: Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map((s) => (s.textContent || '').slice(0, 1000)),
      htmlText: document.body.innerText.slice(0, 2000),
    })
  `);
  console.log(JSON.stringify(data, null, 2));
} finally {
  await page.closeWindow();
}
