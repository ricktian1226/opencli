import { Page } from '../.opencli-global/node_modules/@jackwener/opencli/dist/browser/page.js';

const username = process.argv[2];

if (!username) {
  console.error('Usage: node scripts/fetch-twitter-top3.mjs <username>');
  process.exit(1);
}

const page = new Page(`twitter-top3-${Date.now()}`);

function jsString(value) {
  return JSON.stringify(value);
}

try {
  await page.goto(`https://x.com/${username}`, { settleMs: 3000 });
  await page.wait(3);

  const urls = await page.evaluate(`
    () => {
      const anchors = Array.from(document.querySelectorAll('article[data-testid="tweet"] a[href*="/status/"]'));
      const seen = new Set();
      const out = [];
      for (const a of anchors) {
        const href = a.getAttribute('href') || '';
        const match = href.match(/^\\/([^/]+)\\/status\\/(\\d+)/);
        if (!match) continue;
        const abs = 'https://x.com' + href.split('?')[0];
        if (seen.has(abs)) continue;
        seen.add(abs);
        out.push(abs);
        if (out.length >= 3) break;
      }
      return out;
    }
  `);

  const results = [];

  for (const url of urls) {
    await page.goto(url, { settleMs: 2500 });
    await page.wait(2);

    const detail = await page.evaluate(`
      () => {
        const article = document.querySelector('article[data-testid="tweet"]');
        if (!article) return null;

        const textNodes = Array.from(article.querySelectorAll('[data-testid="tweetText"]'));
        const text = textNodes.map(n => n.innerText.trim()).filter(Boolean).join('\\n\\n');

        const timeEl = article.querySelector('time');
        const createdAt = timeEl ? timeEl.getAttribute('datetime') || '' : '';

        const media = [];

        for (const img of article.querySelectorAll('img')) {
          const src = img.getAttribute('src') || '';
          const alt = img.getAttribute('alt') || '';
          if (!src) continue;
          if (src.includes('profile_images') || src.includes('emoji') || src.includes('abs-0.twimg.com')) continue;
          media.push({ type: 'image', url: src, alt });
        }

        for (const video of article.querySelectorAll('video')) {
          const poster = video.getAttribute('poster') || '';
          const src = video.getAttribute('src') || '';
          media.push({ type: 'video', url: src || poster, poster });
        }

        const unique = [];
        const seen = new Set();
        for (const item of media) {
          if (!item.url || seen.has(item.url)) continue;
          seen.add(item.url);
          unique.push(item);
        }

        return {
          url: window.location.href,
          text,
          createdAt,
          media: unique,
        };
      }
    `);

    if (detail) {
      results.push(detail);
    }
  }

  console.log(JSON.stringify(results, null, 2));
} finally {
  await page.closeWindow();
}
