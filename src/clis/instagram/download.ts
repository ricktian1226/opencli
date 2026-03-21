import * as fs from 'node:fs';
import * as path from 'node:path';
import { cli, Strategy } from '../../registry.js';
import { formatCookieHeader, httpDownload, sanitizeFilename } from '../../download/index.js';
import { DownloadProgressTracker, formatBytes } from '../../download/progress.js';
import { extractPostDetailFromMedia, parseInstagramPostRef } from './helpers.js';

cli({
  site: 'instagram',
  name: 'download',
  description: 'Download media from a single Instagram post or reel',
  domain: 'www.instagram.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'url', type: 'string', required: true, positional: true, help: 'Instagram post/reel URL or shortcode' },
    { name: 'output', default: './instagram-downloads', help: 'Output directory' },
  ],
  columns: ['index', 'type', 'status', 'size', 'path'],
  func: async (page, kwargs) => {
    const ref = parseInstagramPostRef(String(kwargs.url));
    if (!ref) throw new Error('Instagram post URL or shortcode is required');

    const targetUrl = `https://www.instagram.com/${ref.kind}/${ref.shortcode}/`;
    const outputRoot = path.resolve(String(kwargs.output || './instagram-downloads'));

    await page.goto(targetUrl);
    await page.wait(4);

    const payload = await page.evaluate(`
      (async function () {
        var shortcode = ${JSON.stringify(ref.shortcode)};

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
          for (var i = 0; i < els.length; i++) {
            out.push(clean(els[i].getAttribute(name)));
          }
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

        var imageUrls = uniq(queryAllAttr('main article img, article img', 'src'))
          .filter(function (url) { return /^https?:\\/\\//i.test(url); });
        var videoUrls = uniq(queryAllAttr('main article video, main article video source, article video, article video source', 'src'))
          .filter(function (url) { return /^https?:\\/\\//i.test(url); });

        return {
          apiMedia: apiMedia,
          apiError: apiError,
          fallbackMedia: {
            code: shortcode,
            media_type: videoUrls.length > 0 ? 2 : 1,
            image_versions2: { candidates: imageUrls.map(function (url) { return { url: url }; }) },
            video_versions: videoUrls.map(function (url) { return { url: url }; }),
          },
        };
      })()
    `);

    const detail = extractPostDetailFromMedia(
      (payload as any)?.apiMedia || (payload as any)?.fallbackMedia,
      targetUrl,
    );
    if (!detail) {
      throw new Error((payload as any)?.apiError || 'Failed to resolve Instagram media for download');
    }

    const media = [
      ...detail.image_urls.map((url) => ({ type: 'image', url })),
      ...detail.video_urls.map((url) => ({ type: 'video', url })),
    ];

    if (media.length === 0) {
      throw new Error('No downloadable media found for this Instagram post');
    }

    const cookies = formatCookieHeader(await page.getCookies({ domain: 'instagram.com' }));
    const baseName = sanitizeFilename(`${detail.author || 'instagram'}_${detail.shortcode}`, 120) || detail.shortcode;
    const outputDir = path.join(outputRoot, baseName);
    fs.mkdirSync(outputDir, { recursive: true });

    const tracker = new DownloadProgressTracker(media.length, true);
    const results: any[] = [];

    for (let i = 0; i < media.length; i++) {
      const item = media[i];
      const ext = item.type === 'video' ? 'mp4' : 'jpg';
      const filename = `${baseName}_${i + 1}.${ext}`;
      const destPath = path.join(outputDir, filename);
      const progressBar = tracker.onFileStart(filename, i);

      try {
        const result = await httpDownload(item.url, destPath, {
          cookies,
          timeout: item.type === 'video' ? 60000 : 30000,
          onProgress: (received, total) => {
            if (progressBar) progressBar.update(received, total);
          },
        });

        if (progressBar) {
          progressBar.complete(result.success, result.success ? formatBytes(result.size) : undefined);
        }
        tracker.onFileComplete(result.success);

        results.push({
          index: i + 1,
          type: item.type,
          status: result.success ? 'success' : 'failed',
          size: result.success ? formatBytes(result.size) : (result.error || 'unknown error'),
          path: result.success ? destPath : '',
        });
      } catch (error: any) {
        if (progressBar) progressBar.fail(error.message);
        tracker.onFileComplete(false);
        results.push({
          index: i + 1,
          type: item.type,
          status: 'failed',
          size: error.message,
          path: '',
        });
      }
    }

    tracker.finish();
    return results;
  },
});
