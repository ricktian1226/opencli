import fs from 'node:fs';
import path from 'node:path';
import { Page } from '../.opencli-global/node_modules/@jackwener/opencli/dist/browser/page.js';

const outputPath = process.argv[2] || './downloads/tweets/kyliejenner_tweet2_video.mp4';
const page = new Page(`tw-video-save-${Date.now()}`);

try {
  await page.goto('https://x.com/KylieJenner/status/2029676046187200725', { settleMs: 4000 });
  await page.wait(4);

  const info = await page.evaluate(`
    async () => {
      const video = document.querySelector('video');
      const src = video ? (video.currentSrc || video.getAttribute('src') || '') : '';
      if (!src) return { error: 'No video src found' };
      const res = await fetch(src);
      const blob = await res.blob();
      return { size: blob.size, type: blob.type };
    }
  `);

  console.error(JSON.stringify(info));

  const dataUrl = await page.evaluate(`
    async () => {
      const video = document.querySelector('video');
      const src = video ? (video.currentSrc || video.getAttribute('src') || '') : '';
      if (!src) return { error: 'No video src found' };
      const res = await fetch(src);
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  `);

  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    throw new Error('Failed to read video blob as data URL');
  }

  const base64 = dataUrl.split(',')[1];
  const resolved = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, Buffer.from(base64, 'base64'));
  console.log(resolved);
} finally {
  await page.closeWindow();
}
