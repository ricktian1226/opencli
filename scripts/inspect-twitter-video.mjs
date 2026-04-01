import { Page } from '../.opencli-global/node_modules/@jackwener/opencli/dist/browser/page.js';

const page = new Page(`tw-video-${Date.now()}`);

try {
  await page.goto('https://x.com/KylieJenner/status/2029676046187200725', { settleMs: 4000 });
  await page.wait(4);
  const data = await page.evaluate(`
    () => {
      const video = document.querySelector('video');
      const source = document.querySelector('video source');
      const entries = performance.getEntriesByType('resource')
        .map(r => r.name)
        .filter(n => /video|twimg|m3u8|mp4|playlist/i.test(n));
      return {
        videoSrc: video ? (video.getAttribute('src') || video.currentSrc || '') : '',
        sourceSrc: source ? (source.getAttribute('src') || '') : '',
        poster: video ? (video.getAttribute('poster') || '') : '',
        entries: entries.slice(-100),
      };
    }
  `);
  console.log(JSON.stringify(data, null, 2));
} finally {
  await page.closeWindow();
}
