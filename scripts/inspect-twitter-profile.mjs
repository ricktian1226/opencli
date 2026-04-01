import { Page } from '../.opencli-global/node_modules/@jackwener/opencli/dist/browser/page.js';

const username = process.argv[2];
const page = new Page(`twitter-inspect-${Date.now()}`);

try {
  await page.goto(`https://x.com/${username}`, { settleMs: 3000 });
  await page.wait(3);
  const result = await page.evaluate(`
    () => {
      return Array.from(document.querySelectorAll('article[data-testid="tweet"]')).slice(0, 10).map((article, idx) => {
        const links = Array.from(article.querySelectorAll('a[href*="/status/"]')).map(a => a.getAttribute('href'));
        const images = Array.from(article.querySelectorAll('img')).map(img => ({
          src: img.getAttribute('src') || '',
          alt: img.getAttribute('alt') || '',
        })).filter(img => img.src && !img.src.includes('profile_images') && !img.src.includes('emoji') && !img.src.includes('abs-0.twimg.com'));
        const videos = Array.from(article.querySelectorAll('video')).map(video => ({
          src: video.getAttribute('src') || '',
          poster: video.getAttribute('poster') || '',
        }));
        const text = Array.from(article.querySelectorAll('[data-testid="tweetText"]')).map(n => n.innerText.trim()).filter(Boolean).join('\\n\\n');
        const time = article.querySelector('time')?.getAttribute('datetime') || '';
        const userLinks = Array.from(article.querySelectorAll('a[href^="/"]')).map(a => a.getAttribute('href')).filter(Boolean);
        return {
          idx,
          text,
          time,
          links,
          images,
          videos,
          userLinks: userLinks.slice(0, 10),
          html: article.innerText.slice(0, 500),
        };
      });
    }
  `);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await page.closeWindow();
}
