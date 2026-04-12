import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { cli, Strategy } from '../../registry.js';
import { formatCookieHeader, httpDownload } from '../../download/index.js';
import { extractPostDetailFromMedia, parseInstagramPostRef, type InstagramPostDetail } from './helpers.js';

type ArchiveRequest = {
  url: string;
};

type ArchivedPost = InstagramPostDetail & {
  username: string;
  captionZh: string;
  thumbnail: string;
};

type ExistingArchive = {
  captionZh?: string;
  local_assets?: string[];
};

type DownloadResult = {
  success: boolean;
  size: number;
  error?: string;
};

type ExportFormat = 'html' | 'pdf';

async function sleep(seconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

function parseInputList(raw: string): ArchiveRequest[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^url\s*$/i.test(line))
    .map((url) => ({ url }));
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

function hasCjk(text: string): boolean {
  return /[\u3400-\u9fff]/.test(String(text || ''));
}

function joinBilingualParagraphs(original: string, translated: string): string {
  const originalBlocks = splitParagraphs(original);
  const translatedBlocks = splitParagraphs(translated);
  const count = Math.max(originalBlocks.length, translatedBlocks.length, 1);

  const lines: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const originalBlock = originalBlocks[index] || '';
    const translatedBlock = translatedBlocks[index] || '';
    lines.push(originalBlock);
    lines.push('');
    lines.push(translatedBlock);
    if (index !== count - 1) lines.push('', '');
  }

  return lines.join('\n').trimEnd() + '\n';
}

function renderParagraph(text: string, translated: boolean): string {
  if (!text) {
    return '<p style="margin:0; font-size:15px; line-height:1.9; color:#6b7280;">\u6682\u65e0\u5185\u5bb9</p>';
  }

  const style = translated
    ? 'margin:0; font-size:15px; line-height:1.9; color:#0f172a; text-align:justify;'
    : 'margin:0; font-size:15px; line-height:1.9; color:#1f2937; text-align:justify;';

  return `<p style="${style}">${escapeHtml(text).replace(/\r?\n/g, '<br/>')}</p>`;
}

function renderBilingualBlocks(original: string, translated: string): string {
  const originalBlocks = splitParagraphs(original);
  const translatedBlocks = splitParagraphs(translated);
  const count = Math.max(originalBlocks.length, 1);

  return Array.from({ length: count }, (_, index) => {
    const originalBlock = originalBlocks[index] || '';
    const translatedBlock = translatedBlocks[index] || '';
    const translatedHtml = translatedBlock
      ? `
      <p style="margin:0; padding:16px 16px 14px; background:#f9fafb; border-left:4px solid #14b8a6; border-radius:8px;">
        <span style="display:block; font-size:15px; line-height:1.9; color:#0f172a; text-align:justify;">${escapeHtml(translatedBlock).replace(/\r?\n/g, '<br/>')}</span>
      </p>
      `.trim()
      : '';

    return `
    <section style="margin:0 0 22px;">
      <div style="margin:0 0 10px;">
        ${renderParagraph(originalBlock, false)}
      </div>
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

function allocateOutputDir(outputRoot: string, username: string, seen: Map<string, number>): string {
  const count = (seen.get(username) || 0) + 1;
  seen.set(username, count);
  return path.join(outputRoot, count === 1 ? username : `${username}__${count}`);
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
    let translatedText = '';
    for (let attempt = 0; attempt < 3; attempt += 1) {
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
        translatedText = String(translated || '').trim();
        if (translatedText && translatedText !== block.trim()) break;
      } catch {
        translatedText = '';
      }

      if (attempt < 2) {
        await sleep(1.2 * (attempt + 1));
      }
    }

    translatedBlocks.push(translatedText);
    await sleep(1.2);
  }

  return translatedBlocks.join('\n\n').trim();
}

async function resolveSinglePost(page: any, urlOrShortcode: string): Promise<InstagramPostDetail> {
  const ref = parseInstagramPostRef(String(urlOrShortcode));
  if (!ref) throw new Error('Instagram post URL is required');

  const targetUrl = `https://www.instagram.com/${ref.kind}/${ref.shortcode}/`;
  await page.goto(targetUrl);
  await page.wait(4);

  const payload = await page.evaluate(`
    (async function () {
      var shortcode = ${JSON.stringify(ref.shortcode)};
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

function writeCaption(outputDir: string, original: string, translated: string): void {
  fs.writeFileSync(path.join(outputDir, 'caption.txt'), joinBilingualParagraphs(original, translated), 'utf-8');
}

function writeLinkFiles(outputDir: string, post: ArchivedPost, assetFiles: string[]): void {
  const remoteUrls = [post.thumbnail, ...post.image_urls.filter((url) => url !== post.thumbnail), ...post.video_urls].filter(Boolean);
  fs.writeFileSync(path.join(outputDir, 'links.txt'), remoteUrls.join('\n') + '\n', 'utf-8');
  fs.writeFileSync(path.join(outputDir, 'links.json'), JSON.stringify({ ...post, local_assets: assetFiles }, null, 2), 'utf-8');
}

function resolveChromeBinary(): string {
  const candidates = [
    process.env.CHROME_BIN,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean) as string[];

  const match = candidates.find((candidate) => fs.existsSync(candidate));
  if (!match) {
    throw new Error('Chrome executable not found, cannot export PDF');
  }
  return match;
}

function exportHtmlToPdf(htmlPath: string, pdfPath: string): void {
  const chromeBinary = resolveChromeBinary();
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--allow-file-access-from-files',
    '--print-to-pdf-no-header',
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).href,
  ];

  const result = spawnSync(chromeBinary, args, {
    stdio: 'pipe',
    encoding: 'utf-8',
    timeout: 120_000,
    windowsHide: true,
  });

  if (result.status !== 0 || !fs.existsSync(pdfPath)) {
    throw new Error((result.stderr || result.stdout || 'Failed to export PDF').trim());
  }
}

function renderWeixinArticle(
  post: ArchivedPost,
  assetFiles: string[],
  index: number,
  assetBase = './',
  options: { includeVideos?: boolean } = {},
): string {
  const publishDate = formatPublishDate(post.taken_at);
  const includeVideos = options.includeVideos ?? true;
  const mediaHtml = assetFiles
    .filter((file) => includeVideos || !/\.(mp4|webm|mov)$/i.test(file))
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

function ensureHtmlFile(htmlPath: string, html: string, exportFormat: ExportFormat): void {
  if (exportFormat === 'pdf' && fs.existsSync(htmlPath) && fs.statSync(htmlPath).size > 0) {
    return;
  }
  fs.writeFileSync(htmlPath, html, 'utf-8');
}

function withPdfTempHtml(htmlPath: string, html: string, callback: (tempPath: string) => void): void {
  const tempPath = htmlPath.replace(/\.html$/i, '.pdf-export.html');
  fs.writeFileSync(tempPath, html, 'utf-8');
  try {
    callback(tempPath);
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

function writeWeixinHtml(outputDir: string, post: ArchivedPost, assetFiles: string[], exportFormat: ExportFormat): void {
  const html = wrapWeixinHtml(`${post.username} - ${post.shortcode}`, [renderWeixinArticle(post, assetFiles, 1)]);
  const htmlPath = path.join(outputDir, 'weixin.html');
  ensureHtmlFile(htmlPath, html, exportFormat);
  if (exportFormat === 'pdf') {
    const pdfHtml = wrapWeixinHtml(
      `${post.username} - ${post.shortcode}`,
      [renderWeixinArticle(post, assetFiles, 1, './', { includeVideos: false })],
    );
    withPdfTempHtml(htmlPath, pdfHtml, (tempPath) => exportHtmlToPdf(tempPath, path.join(outputDir, 'weixin.pdf')));
  }
}

function writeRootWeixinHtml(
  outputRoot: string,
  entries: Array<{ post: ArchivedPost; dirName: string; assetFiles: string[] }>,
  exportFormat: ExportFormat,
): void {
  const html = wrapWeixinHtml(
    'Instagram Archive',
    entries.map((entry, index) => renderWeixinArticle(entry.post, entry.assetFiles, index + 1, `./${entry.dirName}/`)),
  );
  const htmlPath = path.join(outputRoot, 'weixin.html');
  ensureHtmlFile(htmlPath, html, exportFormat);
  if (exportFormat === 'pdf') {
    const pdfHtml = wrapWeixinHtml(
      'Instagram Archive',
      entries.map((entry, index) =>
        renderWeixinArticle(entry.post, entry.assetFiles, index + 1, `./${entry.dirName}/`, { includeVideos: false })),
    );
    withPdfTempHtml(htmlPath, pdfHtml, (tempPath) => exportHtmlToPdf(tempPath, path.join(outputRoot, 'weixin.pdf')));
  }
}

async function archiveSingle(
  page: any,
  request: ArchiveRequest,
  outputRoot: string,
  seenDirs: Map<string, number>,
  exportFormat: ExportFormat,
) {
  const detail = await resolveSinglePost(page, request.url);
  const username = detail.author || 'instagram';
  const outputDir = allocateOutputDir(outputRoot, username, seenDirs);
  fs.mkdirSync(outputDir, { recursive: true });
  const existing = readExistingArchive(outputDir);

  const cookies = formatCookieHeader(await page.getCookies({ domain: 'instagram.com' }));
  const translated = await translateParagraphs(page, detail.caption || '');
  const captionZh = translated || existing?.captionZh || '';
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
  writeWeixinHtml(outputDir, archived, assetFiles, exportFormat);

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
  name: 'archive',
  description: 'Archive Instagram post URLs into creator folders with caption, media, and weixin.html',
  domain: 'www.instagram.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'input', type: 'string', required: true, positional: true, help: 'Path to a text file containing Instagram post/reel URLs' },
    { name: 'output', default: './downloads', help: 'Output directory' },
    { name: 'export-format', default: 'html', help: 'Export format: html or pdf', choices: ['html', 'pdf'] },
  ],
  columns: ['username', 'shortcode', 'status', 'dir'],
  func: async (page, kwargs) => {
    const inputPath = path.resolve(String(kwargs.input));
    const outputRoot = path.resolve(String(kwargs.output || './downloads'));
    const exportFormat = String(kwargs['export-format'] || 'html').toLowerCase() as ExportFormat;
    const raw = fs.readFileSync(inputPath, 'utf-8');
    const requests = parseInputList(raw);
    if (requests.length === 0) throw new Error('No valid Instagram URLs found in input file');

    fs.mkdirSync(outputRoot, { recursive: true });

    const seenDirs = new Map<string, number>();
    const results = [];
    for (const request of requests) {
      results.push(await archiveSingle(page, request, outputRoot, seenDirs, exportFormat));
    }

    writeRootWeixinHtml(
      outputRoot,
      results.map((item: any) => ({
        post: item.post,
        dirName: item.dirName,
        assetFiles: item.assetFiles,
      })),
      exportFormat,
    );

    return results.map(({ post, dirName, assetFiles, ...row }: any) => row);
  },
});
