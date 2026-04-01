import { Page } from '../.opencli-global/node_modules/@jackwener/opencli/dist/browser/page.js';

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error('Usage: node scripts/fetch-twitter-details.mjs <tweet-url> [...]');
  process.exit(1);
}

const page = new Page(`twitter-details-${Date.now()}`);

try {
  const results = [];

  for (const url of urls) {
    await page.goto(url, { settleMs: 3000 });
    await page.wait(2);

    const detail = await page.evaluate(`
      () => {
        const article = document.querySelector('article[data-testid="tweet"]');
        if (!article) return null;

        const expand = Array.from(article.querySelectorAll('div[role="button"], span')).find(el => {
          const text = (el.textContent || '').trim();
          return text === 'Show more' || text === '显示更多';
        });
        if (expand && typeof expand.click === 'function') expand.click();

        const text = Array.from(article.querySelectorAll('[data-testid="tweetText"]'))
          .map(n => n.innerText.trim())
          .filter(Boolean)
          .join('\\n\\n');

        const createdAt = article.querySelector('time')?.getAttribute('datetime') || '';
        const mediaLinks = Array.from(article.querySelectorAll('a[href*="/status/"]'))
          .map(a => a.getAttribute('href') || '')
          .filter(href => /\\/status\\/\\d+\\/(photo|video)\\//.test(href))
          .map(href => href.startsWith('http') ? href : 'https://x.com' + href.split('?')[0]);

        const images = Array.from(article.querySelectorAll('img'))
          .map(img => img.getAttribute('src') || '')
          .filter(src => src && !src.includes('profile_images') && !src.includes('emoji') && !src.includes('abs-0.twimg.com'));

        const videos = Array.from(article.querySelectorAll('video'))
          .map(video => ({
            src: video.getAttribute('src') || '',
            poster: video.getAttribute('poster') || '',
          }));

        return {
          url: window.location.href,
          text,
          createdAt,
          mediaLinks: Array.from(new Set(mediaLinks)),
          imageUrls: Array.from(new Set(images)),
          videos,
        };
      }
    `);

    results.push(detail);
  }

  console.log(JSON.stringify(results, null, 2));
} finally {
  await page.closeWindow();
}
