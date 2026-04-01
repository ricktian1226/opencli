import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { cli, Strategy } from '../../registry.js';
import { formatCookieHeader, httpDownload } from '../../download/index.js';
import {
  extractPostDetailFromMedia,
  extractPostsFromFeed,
  normalizeInstagramUsername,
  type InstagramPostDetail,
} from './helpers.js';

type ArchivedPost = InstagramPostDetail & {
  username: string;
  captionZh: string;
  thumbnail: string;
};

type ExistingArchive = {
  shortcode?: string;
  captionZh?: string;
  local_assets?: string[];
};

type DownloadResult = {
  success: boolean;
  size: number;
  error?: string;
};

async function sleep(seconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function withRetries<T>(
  task: () => Promise<T>,
  attempts = 3,
  delaySeconds = 2,
): Promise<T> {
  let lastError: unknown;
  for (let index = 0; index < attempts; index += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (index < attempts - 1) await sleep(delaySeconds * (index + 1));
    }
  }
  throw lastError;
}

function guessExtension(url: string, fallback: string): string {
  try {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname).toLowerCase();
    if (ext) return ext;
  } catch {
    // keep fallback
  }
  return fallback;
}

function escapeHtml(input: string): string {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function splitParagraphs(text: string): string[] {
  return String(text || '')
    .trim()
    .split(/\r?\n\s*\r?\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function joinBilingualParagraphs(original: string, translated: string): string {
  const originalBlocks = splitParagraphs(original);
  const translatedBlocks = splitParagraphs(translated);
  const count = Math.max(originalBlocks.length, translatedBlocks.length, 1);

  const lines: string[] = [];
  for (let index = 0; index < count; index += 1) {
    lines.push(originalBlocks[index] || '');
    lines.push('');
    lines.push(translatedBlocks[index] || '');
    if (index !== count - 1) lines.push('', '');
  }

  return lines.join('\n').trimEnd() + '\n';
}

function renderParagraph(text: string): string {
  if (!text) return '';
  return `<p style="margin:0; font-size:15px; line-height:1.9; color:#1f2937; text-align:justify;">${escapeHtml(text).replace(/\r?\n/g, '<br/>')}</p>`;
}

function renderTranslatedParagraph(text: string): string {
  if (!text) return '';
  return `
  <p style="margin:0; padding:16px 16px 14px; background:#f9fafb; border-left:4px solid #14b8a6; border-radius:8px;">
    <span style="display:block; font-size:15px; line-height:1.9; color:#0f172a; text-align:justify;">${escapeHtml(text).replace(/\r?\n/g, '<br/>')}</span>
  </p>
  `.trim();
}

function renderBilingualBlocks(original: string, translated: string): string {
  const originalBlocks = splitParagraphs(original);
  const translatedBlocks = splitParagraphs(translated);
  const count = Math.max(originalBlocks.length, 1);

  return Array.from({ length: count }, (_, index) => {
    const originalHtml = renderParagraph(originalBlocks[index] || '');
    const translatedHtml = renderTranslatedParagraph(translatedBlocks[index] || '');
    return `
    <section style="margin:0 0 22px;">
      ${originalHtml ? `<div style="margin:0 0 10px;">${originalHtml}</div>` : ''}
      ${translatedHtml}
    </section>
    `.trim();
  }).join('\n');
}

function formatPublishDate(value: string): string {
  if (!value) return '';

  try {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}&#24180;${month}&#26376;${day}&#26085;`;
  } catch {
    return value;
  }
}

function readExistingArchive(outputDir: string): ExistingArchive | null {
  const jsonPath = path.join(outputDir, 'links.json');
  if (!fs.existsSync(jsonPath)) return null;

  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8').replace(/^\uFEFF/, '');
    return JSON.parse(raw) as ExistingArchive;
  } catch {
    return null;
  }
}

function reserveOutputDir(
  outputRoot: string,
  username: string,
  shortcode: string,
  seen: Set<string>,
): string {
  for (let index = 1; index < 10000; index += 1) {
    const dir = path.join(outputRoot, index === 1 ? username : `${username}__${index}`);
    if (seen.has(dir)) continue;

    if (!fs.existsSync(dir)) {
      seen.add(dir);
      return dir;
    }

    const existing = readExistingArchive(dir);
    if (existing?.shortcode === shortcode) {
      seen.add(dir);
      return dir;
    }
  }

  throw new Error(`Unable to allocate archive directory for ${username}/${shortcode}`);
}

async function downloadViaBrowser(page: any, url: string, destPath: string): Promise<DownloadResult> {
  try {
    const payload = await page.evaluate(`
      (async () => {
        const targetUrl = ${JSON.stringify(url)};
        try {
          const response = await fetch(targetUrl, { credentials: 'include' });
          if (!response.ok) return { success: false, error: 'browser fetch HTTP ' + response.status };

          const arrayBuffer = await response.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 0x8000;
          for (let index = 0; index < bytes.length; index += chunkSize) {
            const chunk = bytes.subarray(index, index + chunkSize);
            binary += String.fromCharCode.apply(null, Array.from(chunk));
          }
          return { success: true, base64: btoa(binary), size: bytes.length };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
      })()
    `);

    if (!(payload as any)?.success || !(payload as any)?.base64) {
      return { success: false, size: 0, error: String((payload as any)?.error || 'browser fetch failed') };
    }

    const buffer = Buffer.from(String((payload as any).base64), 'base64');
    fs.writeFileSync(destPath, buffer);
    return { success: true, size: buffer.byteLength };
  } catch (error) {
    return { success: false, size: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

async function downloadWithFallback(
  page: any,
  url: string,
  destPath: string,
  cookies: string,
  timeout: number,
): Promise<DownloadResult> {
  const direct = await httpDownload(url, destPath, { cookies, timeout });
  if (direct.success) return direct;

  const browserSide = await downloadViaBrowser(page, url, destPath);
  if (browserSide.success) return browserSide;

  const curlBinary = os.platform() === 'win32' ? 'curl.exe' : 'curl';
  const args = ['-L', url, '-o', destPath];
  if (cookies) args.unshift('-H', `Cookie: ${cookies}`);

  const fallback = spawnSync(curlBinary, args, { stdio: 'pipe', encoding: 'utf-8' });
  if (fallback.status === 0 && fs.existsSync(destPath)) {
    return { success: true, size: fs.statSync(destPath).size };
  }

  return {
    success: false,
    size: 0,
    error: [direct.error, browserSide.error, fallback.stderr, fallback.stdout]
      .filter(Boolean)
      .join(' | ')
      .slice(0, 500),
  };
}

async function translateParagraphs(page: any, text: string): Promise<string> {
  const blocks = splitParagraphs(text);
  if (blocks.length === 0) return '';

  const translatedBlocks: string[] = [];
  for (const block of blocks) {
    try {
      const translated = await page.evaluate(`
        (async () => {
          const text = ${JSON.stringify(block)};
          try {
            const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=' + encodeURIComponent(text);
            const resp = await fetch(url);
            if (!resp.ok) return '';
            const data = await resp.json();
            return Array.isArray(data?.[0]) ? data[0].map((item) => item?.[0] || '').join('') : '';
          } catch {
            return '';
          }
        })()
      `);
      translatedBlocks.push(String(translated || '').trim());
    } catch {
      translatedBlocks.push('');
    }
  }

  return translatedBlocks.join('\n\n').trim();
}

async function resolveSinglePost(page: any, targetUrl: string, shortcode: string): Promise<InstagramPostDetail> {
  await page.goto(targetUrl);
  await page.wait(4);

  const payload = await page.evaluate(`
    (async function () {
      var shortcode = ${JSON.stringify(shortcode)};
      var targetUrl = ${JSON.stringify(targetUrl)};

      function clean(value) {
        return String(value || '').trim();
      }

      function decodeEntities(value) {
        return clean(value)
          .replace(/&#(\\d+);/g, function (_, code) { return String.fromCharCode(Number(code)); })
          .replace(/&#x([0-9a-f]+);/gi, function (_, code) { return String.fromCharCode(parseInt(code, 16)); })
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, String.fromCharCode(39))
          .replace(/&apos;/g, String.fromCharCode(39))
          .replace(/&amp;/g, '&');
      }

      function uniq(values) {
        var out = [];
        var seen = {};
        for (var i = 0; i < values.length; i++) {
          var value = clean(values[i]);
          if (!value) continue;
          if (!seen[value]) {
            seen[value] = true;
            out.push(value);
          }
        }
        return out;
      }

      function attr(selector, name) {
        var el = document.querySelector(selector);
        return clean(el ? el.getAttribute(name) : '');
      }

      function queryAllAttr(selector, name) {
        var els = document.querySelectorAll(selector);
        var out = [];
        for (var i = 0; i < els.length; i++) out.push(clean(els[i].getAttribute(name)));
        return out;
      }

      var appUrl = decodeEntities(attr('meta[property="al:ios:url"]', 'content'));
      var mediaIdMatch = appUrl.match(/instagram:\\/\\/media\\?id=(\\d+)/i);
      var mediaId = mediaIdMatch ? mediaIdMatch[1] : '';

      async function fetchJson(url) {
        var resp = await fetch(url, {
          credentials: 'include',
          headers: {
            'x-ig-app-id': '936619743392459',
            'x-requested-with': 'XMLHttpRequest',
          },
        });
        if (!resp.ok) throw new Error('HTTP ' + resp.status + ' for ' + url);
        return await resp.json();
      }

      var apiMedia = null;
      var apiError = '';
      var apiCandidates = [];
      if (mediaId) apiCandidates.push('/api/v1/media/' + mediaId + '/info/');
      apiCandidates.push('/api/v1/media/' + shortcode + '/info/');
      apiCandidates.push('/api/v1/media/shortcode/' + shortcode + '/info/');

      for (var apiIndex = 0; apiIndex < apiCandidates.length; apiIndex++) {
        try {
          var data = await fetchJson(apiCandidates[apiIndex]);
          apiMedia = data && data.items && data.items[0] ? data.items[0] : null;
          if (apiMedia) break;
        } catch (error) {
          apiError = error instanceof Error ? error.message : String(error);
        }
      }

      var fallback = {
        code: shortcode,
        media_type: queryAllAttr('article video', 'src').length > 0 ? 2 : 1,
        image_versions2: { candidates: uniq(queryAllAttr('article img', 'src')).map(function (url) { return { url: url }; }) },
        video_versions: uniq(queryAllAttr('article video, article video source', 'src')).map(function (url) { return { url: url }; }),
        user: { username: clean((document.querySelector('header a[href^="/"]') || {}).textContent || '') },
        caption: { text: decodeEntities(attr('meta[property="og:description"]', 'content')).split(':').slice(1).join(':').trim() },
      };

      return { apiMedia: apiMedia, apiError: apiError, fallbackMedia: fallback, targetUrl: targetUrl };
    })()
  `);

  const detail = extractPostDetailFromMedia(
    (payload as any)?.apiMedia || (payload as any)?.fallbackMedia,
    (payload as any)?.targetUrl || targetUrl,
  );
  if (!detail) throw new Error((payload as any)?.apiError || 'Failed to resolve Instagram post');
  return detail;
}

async function resolveUserPosts(page: any, username: string, limit: number): Promise<Array<{ shortcode: string; url: string }>> {
  await page.goto(`https://www.instagram.com/${username}/`);
  await page.wait(4);

  const payload = await page.evaluate(`
    (async () => {
      const headers = {
        'x-ig-app-id': '936619743392459',
        'x-requested-with': 'XMLHttpRequest',
      };

      const pages = [];
      let apiError = '';
      let nextMaxId = '';

      try {
        while (pages.length < ${limit}) {
          const params = new URLSearchParams({ count: String(${limit}) });
          if (nextMaxId) params.set('max_id', nextMaxId);

          const resp = await fetch('/api/v1/feed/user/${username}/username/?' + params.toString(), {
            credentials: 'include',
            headers,
          });
          if (!resp.ok) {
            apiError = 'HTTP ' + resp.status;
            break;
          }

          const pageData = await resp.json();
          const items = Array.isArray(pageData?.items) ? pageData.items : [];
          pages.push.apply(pages, items);

          nextMaxId = String(pageData?.next_max_id || '');
          if (!nextMaxId || items.length === 0) break;
        }
      } catch (error) {
        apiError = error instanceof Error ? error.message : String(error);
      }

      return {
        feed: { items: pages.slice(0, ${limit}) },
        apiError,
      };
    })()
  `);

  const posts = extractPostsFromFeed((payload as any)?.feed)
    .slice(0, limit)
    .map((post) => ({
      shortcode: post.shortcode,
      url: post.url,
    }));

  if (posts.length === 0) {
    throw new Error((payload as any)?.apiError || `No Instagram posts found for ${username}`);
  }

  return posts;
}

function writeCaption(outputDir: string, original: string, translated: string): void {
  fs.writeFileSync(path.join(outputDir, 'caption.txt'), joinBilingualParagraphs(original, translated), 'utf-8');
}

function writeLinkFiles(outputDir: string, post: ArchivedPost, assetFiles: string[]): void {
  const remoteUrls = [post.thumbnail, ...post.image_urls.filter((url) => url !== post.thumbnail), ...post.video_urls].filter(Boolean);
  fs.writeFileSync(path.join(outputDir, 'links.txt'), remoteUrls.join('\n') + '\n', 'utf-8');
  fs.writeFileSync(path.join(outputDir, 'links.json'), JSON.stringify({ ...post, local_assets: assetFiles }, null, 2), 'utf-8');
}

function renderWeixinArticle(post: ArchivedPost, assetFiles: string[], index: number, assetBase = './'): string {
  const publishDate = formatPublishDate(post.taken_at);
  const mediaHtml = assetFiles
    .map((file) => {
      const relative = `${assetBase}${file}`;
      if (/\.(mp4|webm|mov)$/i.test(file)) {
        return `<section style="margin:0 0 22px;"><video controls style="display:block; width:100%; max-width:100%; border-radius:12px; background:#000;" src="${escapeHtml(relative)}"></video></section>`;
      }
      return `<section style="margin:0 0 22px;"><img style="display:block; width:100%; height:auto; border-radius:12px;" src="${escapeHtml(relative)}" /></section>`;
    })
    .join('\n');

  return `
  <article style="margin:0 0 36px; padding:28px 22px; background:#ffffff;">
    <section style="margin:0 0 20px;">
      <p style="margin:0 0 14px; text-align:center;">
        <span style="display:inline-block; padding:0 0 8px; font-size:28px; line-height:1; font-weight:700; color:#16a34a; border-bottom:3px solid #16a34a;">${index}</span>
      </p>
      <p style="margin:0 0 12px; text-align:center;">
        <span style="display:inline-block; padding:8px 18px 10px 14px; background:#111111; color:#ffffff; font-size:24px; line-height:1.25; font-weight:700;">
          <span style="display:inline-block; width:4px; height:24px; margin-right:12px; vertical-align:-3px; background:#ffffff;"></span>${escapeHtml(post.username)}
        </span>
      </p>
      <p style="margin:0; font-size:13px; line-height:1.8; color:#6b7280; text-align:center;">${publishDate}</p>
    </section>
    <section style="margin:0 0 22px;">
      ${renderBilingualBlocks(post.caption, post.captionZh)}
    </section>
    ${mediaHtml}
  </article>
  `.trim();
}

function wrapWeixinHtml(title: string, articles: string[]): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0; padding:0; background:#f3f4f6;">
  <main style="max-width:760px; margin:0 auto; padding:28px 14px 40px;">
${articles.join('\n    <section style="height:18px;"></section>\n')}
  </main>
</body>
</html>
`;
}

function writeWeixinHtml(outputDir: string, post: ArchivedPost, assetFiles: string[]): void {
  const html = wrapWeixinHtml(`${post.username} - ${post.shortcode}`, [renderWeixinArticle(post, assetFiles, 1)]);
  fs.writeFileSync(path.join(outputDir, 'weixin.html'), html, 'utf-8');
}

function writeRootWeixinHtml(outputRoot: string, entries: Array<{ post: ArchivedPost; dirName: string; assetFiles: string[] }>): void {
  const html = wrapWeixinHtml(
    'Instagram Archive',
    entries.map((entry, index) => renderWeixinArticle(entry.post, entry.assetFiles, index + 1, `./${entry.dirName}/`)),
  );
  fs.writeFileSync(path.join(outputRoot, 'weixin.html'), html, 'utf-8');
}

async function archiveResolvedPost(
  page: any,
  detail: InstagramPostDetail,
  outputRoot: string,
  seenDirs: Set<string>,
) {
  const username = detail.author || 'instagram';
  const outputDir = reserveOutputDir(outputRoot, username, detail.shortcode, seenDirs);
  fs.mkdirSync(outputDir, { recursive: true });
  const existing = readExistingArchive(outputDir);

  const cookies = formatCookieHeader(await page.getCookies({ domain: 'instagram.com' }));
  const translated = await translateParagraphs(page, detail.caption || '');
  const captionZh = translated || existing?.captionZh || detail.caption || '';
  const thumbnail = detail.image_urls[0] || detail.video_urls[0] || '';

  const archived: ArchivedPost = {
    ...detail,
    username,
    captionZh,
    thumbnail,
  };

  writeCaption(outputDir, archived.caption, archived.captionZh);

  const assetFiles: string[] = [];
  const mediaUrls = [
    ...(thumbnail ? [thumbnail] : []),
    ...archived.image_urls.filter((url) => url && url !== thumbnail),
    ...archived.video_urls.filter(Boolean),
  ];

  for (let index = 0; index < mediaUrls.length; index += 1) {
    const url = mediaUrls[index];
    const isVideo = archived.video_urls.includes(url) && !archived.image_urls.includes(url);
    const ext = guessExtension(url, isVideo ? '.mp4' : '.jpg');
    const filename = `${String(index + 1).padStart(3, '0')}${ext}`;
    const destPath = path.join(outputDir, filename);
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
      assetFiles.push(filename);
      continue;
    }

    const result = await downloadWithFallback(page, url, destPath, cookies, isVideo ? 60000 : 30000);
    if (result.success) assetFiles.push(filename);
  }

  writeLinkFiles(outputDir, archived, assetFiles);
  writeWeixinHtml(outputDir, archived, assetFiles);

  return {
    username,
    shortcode: archived.shortcode,
    status: 'success',
    dir: outputDir,
    post: archived,
    dirName: path.basename(outputDir),
    assetFiles,
  };
}

cli({
  site: 'instagram',
  name: 'archive-singleup',
  description: 'Archive the latest N Instagram posts from one creator without changing instagram archive file-input mode',
  domain: 'www.instagram.com',
  strategy: Strategy.COOKIE,
  browser: true,
  timeoutSeconds: 1800,
  args: [
    { name: 'username', type: 'string', required: true, positional: true, help: 'Instagram username or profile URL' },
    { name: 'count', type: 'int', required: true, positional: true, help: 'How many recent posts to archive in reverse chronological order' },
    { name: 'output', default: './downloads', help: 'Output directory' },
  ],
  columns: ['username', 'shortcode', 'status', 'dir'],
  footerExtra: (kwargs) => `Compatibility: you can also call this as "opencli instagram archive singleup ${kwargs.username} ${kwargs.count}"`,
  func: async (page, kwargs) => {
    const username = normalizeInstagramUsername(String(kwargs.username));
    const count = Math.max(1, Number(kwargs.count ?? 1));
    const outputRoot = path.resolve(String(kwargs.output || './downloads'));
    if (!username) throw new Error('Instagram username is required');

    fs.mkdirSync(outputRoot, { recursive: true });

    const summaries = await withRetries(() => resolveUserPosts(page, username, count), 3, 2);
    const seenDirs = new Set<string>();
    const results = [];
    for (const summary of summaries.slice(0, count)) {
      const detail = await withRetries(() => resolveSinglePost(page, summary.url, summary.shortcode), 3, 2);
      results.push(await archiveResolvedPost(page, detail, outputRoot, seenDirs));
    }

    writeRootWeixinHtml(
      outputRoot,
      results.map((item: any) => ({
        post: item.post,
        dirName: item.dirName,
        assetFiles: item.assetFiles,
      })),
    );

    return results.map(({ post, dirName, assetFiles, ...row }: any) => row);
  },
});
