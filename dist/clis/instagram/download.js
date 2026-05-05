import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { cli, Strategy } from '../../registry.js';
import { formatCookieHeader, httpDownload } from '../../download/index.js';
import { DownloadProgressTracker, formatBytes } from '../../download/progress.js';
import { extractPostDetailFromMedia, extractPostsFromFeed, parseInstagramPostRef } from './helpers.js';
function guessExtension(url, fallback) {
    try {
        const parsed = new URL(url);
        const ext = path.extname(parsed.pathname).toLowerCase();
        if (ext === '.heic')
            return '.jpeg';
        if (ext)
            return ext;
    }
    catch {
        // ignore malformed URLs and keep fallback
    }
    return fallback;
}
function sanitizeCaptionSection(label, content) {
    return `${label}\n${content.trim()}\n`;
}
function writeCaptionFile(outputDir, caption) {
    const content = [
        sanitizeCaptionSection('English:', caption || ''),
        sanitizeCaptionSection('Chinese:', ''),
    ].join('\n');
    fs.writeFileSync(path.join(outputDir, 'caption.txt'), content, 'utf-8');
}
function writeMetadataFile(outputDir, post, media) {
    fs.writeFileSync(path.join(outputDir, 'links.json'), JSON.stringify({
        shortcode: post.shortcode,
        type: post.type,
        url: post.url,
        taken_at: post.taken_at,
        caption: post.caption,
        thumbnail: post.thumbnail,
        image_urls: post.image_urls,
        video_urls: post.video_urls,
        media,
    }, null, 2), 'utf-8');
}
function writeLinkHelperFiles(outputDir, post, media) {
    const urls = [
        ...(post.thumbnail ? [post.thumbnail] : []),
        ...media.map((item) => item.url),
    ].filter(Boolean);
    fs.writeFileSync(path.join(outputDir, 'links.txt'), urls.join('\n') + '\n', 'utf-8');
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const scriptLines = [
        `$chrome = '${chromePath}'`,
        'if (-not (Test-Path $chrome)) {',
        "  throw 'Chrome not found at default path.'",
        '}',
        `$urls = @(`,
        ...urls.map((url) => `  '${url.replace(/'/g, "''")}'`),
        `)`,
        'foreach ($url in $urls) {',
        '  Start-Process -FilePath $chrome -ArgumentList $url',
        '  Start-Sleep -Milliseconds 500',
        '}',
    ];
    fs.writeFileSync(path.join(outputDir, 'open-in-chrome.ps1'), scriptLines.join('\n') + '\n', 'utf-8');
}
async function downloadWithFallback(url, destPath, cookies, timeout) {
    const direct = await httpDownload(url, destPath, {
        cookies,
        timeout,
    });
    if (direct.success)
        return direct;
    const curlBinary = os.platform() === 'win32' ? 'curl.exe' : 'curl';
    const args = ['-L', url, '-o', destPath];
    if (cookies) {
        args.unshift('-H', `Cookie: ${cookies}`);
    }
    const fallback = spawnSync(curlBinary, args, {
        stdio: 'pipe',
        encoding: 'utf-8',
    });
    if (fallback.status === 0 && fs.existsSync(destPath)) {
        const size = fs.statSync(destPath).size;
        return { success: true, size };
    }
    const errorText = [direct.error, fallback.stderr, fallback.stdout]
        .filter(Boolean)
        .join(' | ')
        .slice(0, 300);
    return {
        success: false,
        size: 0,
        error: errorText || `curl exit ${fallback.status ?? 'unknown'}`,
    };
}
async function resolveSinglePost(page, targetUrl, shortcode) {
    await page.goto(targetUrl);
    await page.wait(4);
    const payload = await page.evaluate(`
    (async function () {
      var shortcode = ${JSON.stringify(shortcode)};

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
    const detail = extractPostDetailFromMedia(payload?.apiMedia || payload?.fallbackMedia, targetUrl);
    if (!detail) {
        throw new Error(payload?.apiError || 'Failed to resolve Instagram media for download');
    }
    return {
        ...detail,
        thumbnail: detail.image_urls[0] || detail.video_urls[0] || '',
    };
}
async function resolveUserPosts(page, username, limit) {
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
    const posts = extractPostsFromFeed(payload?.feed)
        .slice(0, limit)
        .map((post) => ({
        shortcode: post.shortcode,
        type: post.type,
        author: username,
        caption: post.caption,
        taken_at: post.taken_at || '',
        likes: post.likes,
        comments: post.comments,
        url: post.url,
        image_urls: post.image_urls || (post.thumbnail ? [post.thumbnail] : []),
        video_urls: post.video_urls || (post.video_url ? [post.video_url] : []),
        media_count: post.media_count ?? ((post.image_urls?.length || 0) + (post.video_urls?.length || 0)),
        thumbnail: post.thumbnail,
    }));
    if (posts.length === 0) {
        throw new Error(payload?.apiError || 'No Instagram posts found');
    }
    return posts;
}
async function downloadMediaBundle(page, post, outputRoot) {
    const cookies = formatCookieHeader(await page.getCookies({ domain: 'instagram.com' }));
    const outputDir = path.join(outputRoot, post.shortcode);
    fs.mkdirSync(outputDir, { recursive: true });
    writeCaptionFile(outputDir, post.caption);
    const media = [
        ...post.image_urls
            .filter((url) => url && url !== post.thumbnail)
            .map((url) => ({ type: 'image', url })),
        ...post.video_urls.map((url) => ({ type: 'video', url })),
    ];
    writeMetadataFile(outputDir, post, media);
    writeLinkHelperFiles(outputDir, post, media);
    const tracker = new DownloadProgressTracker(media.length + (post.thumbnail ? 1 : 0) || 1, true);
    const results = [];
    if (post.thumbnail) {
        const thumbnailExt = guessExtension(post.thumbnail, '.jpg');
        const thumbnailPath = path.join(outputDir, `thumbnail${thumbnailExt}`);
        const progressBar = tracker.onFileStart(path.basename(thumbnailPath), 0);
        const thumbnailResult = await downloadWithFallback(post.thumbnail, thumbnailPath, cookies, 30000);
        if (progressBar) {
            progressBar.complete(thumbnailResult.success, thumbnailResult.success ? formatBytes(thumbnailResult.size) : undefined);
        }
        tracker.onFileComplete(thumbnailResult.success);
        results.push({
            shortcode: post.shortcode,
            file: path.basename(thumbnailPath),
            type: 'thumbnail',
            status: thumbnailResult.success ? 'success' : 'failed',
            size: thumbnailResult.success ? formatBytes(thumbnailResult.size) : (thumbnailResult.error || 'unknown error'),
            path: thumbnailResult.success ? thumbnailPath : '',
        });
    }
    for (let i = 0; i < media.length; i++) {
        const item = media[i];
        const progressBar = tracker.onFileStart(`${post.shortcode}_${i + 1}`, i + (post.thumbnail ? 1 : 0));
        const ext = guessExtension(item.url, item.type === 'video' ? '.mp4' : '.jpg');
        const filename = `${item.type}_${i + 1}${ext}`;
        const destPath = path.join(outputDir, filename);
        const result = await downloadWithFallback(item.url, destPath, cookies, item.type === 'video' ? 60000 : 30000);
        if (progressBar) {
            progressBar.complete(result.success, result.success ? formatBytes(result.size) : undefined);
        }
        tracker.onFileComplete(result.success);
        results.push({
            shortcode: post.shortcode,
            file: filename,
            type: item.type,
            status: result.success ? 'success' : 'failed',
            size: result.success ? formatBytes(result.size) : (result.error || 'unknown error'),
            path: result.success ? destPath : '',
            url: item.url,
        });
    }
    tracker.finish();
    return results;
}
cli({
    site: 'instagram',
    name: 'download',
    description: 'Download media from Instagram posts or a creator profile',
    domain: 'www.instagram.com',
    strategy: Strategy.COOKIE,
    browser: true,
    args: [
        { name: 'url', type: 'string', help: 'Instagram post/reel URL or shortcode' },
        { name: 'username', type: 'string', help: 'Instagram username to archive posts from' },
        { name: 'limit', type: 'int', default: 12, help: 'Maximum posts to archive when using --username' },
        { name: 'output', default: './downloads', help: 'Output directory' },
    ],
    columns: ['shortcode', 'file', 'type', 'status', 'size', 'path'],
    func: async (page, kwargs) => {
        const outputRoot = path.resolve(String(kwargs.output || './downloads'));
        const username = String(kwargs.username || '').trim();
        const limit = Math.max(1, Number(kwargs.limit ?? 12));
        let posts = [];
        if (username) {
            posts = await resolveUserPosts(page, username, limit);
        }
        else {
            const ref = parseInstagramPostRef(String(kwargs.url));
            if (!ref)
                throw new Error('Provide --username or an Instagram post URL/shortcode');
            const targetUrl = `https://www.instagram.com/${ref.kind}/${ref.shortcode}/`;
            posts = [await resolveSinglePost(page, targetUrl, ref.shortcode)];
        }
        const results = [];
        for (const post of posts.slice(0, limit)) {
            const postResults = await downloadMediaBundle(page, post, outputRoot);
            results.push(...postResults);
        }
        return results;
    },
});
