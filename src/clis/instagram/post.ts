import { cli, Strategy } from '../../registry.js';
import { parseInstagramPostRef } from './helpers.js';

cli({
  site: 'instagram',
  name: 'post',
  description: 'Read a single Instagram post or reel',
  domain: 'www.instagram.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'url', type: 'string', required: true, positional: true, help: 'Instagram post/reel URL or shortcode' },
  ],
  columns: ['shortcode', 'type', 'author', 'caption', 'taken_at', 'likes', 'comments', 'url'],
  func: async (page, kwargs) => {
    const ref = parseInstagramPostRef(String(kwargs.url));
    if (!ref) throw new Error('Instagram post URL or shortcode is required');

    const fallbackType = ref.kind === 'reel' ? 'reel' : 'post';
    const targetUrl = `https://www.instagram.com/${ref.kind}/${ref.shortcode}/`;

    await page.goto(targetUrl);
    await page.wait(4);

    const detail = await page.evaluate(`
      (async function () {
        var shortcode = ${JSON.stringify(ref.shortcode)};
        var fallbackType = ${JSON.stringify(fallbackType)};

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

        function text(selector) {
          var el = document.querySelector(selector);
          return clean(el ? el.textContent : '');
        }

        function queryAllAttr(selector, name) {
          var els = document.querySelectorAll(selector);
          var out = [];
          for (var i = 0; i < els.length; i++) {
            out.push(clean(els[i].getAttribute(name)));
          }
          return out;
        }

        var meta = {
          ogTitle: decodeEntities(attr('meta[property="og:title"]', 'content')),
          ogDescription: decodeEntities(attr('meta[property="og:description"]', 'content')),
          ogImage: decodeEntities(attr('meta[property="og:image"]', 'content')),
          ogVideo: decodeEntities(attr('meta[property="og:video"]', 'content')),
          canonicalUrl: decodeEntities(attr('link[rel="canonical"]', 'href')),
        };

        var imageUrls = uniq([meta.ogImage].concat(queryAllAttr('main article img, article img', 'src')))
          .filter(function (url) { return /^https?:\\/\\//i.test(url); });
        var videoUrls = uniq([meta.ogVideo].concat(queryAllAttr('main article video, main article video source, article video, article video source', 'src')))
          .filter(function (url) { return /^https?:\\/\\//i.test(url); });

        var caption = '';
        var metaDescription = decodeEntities(attr('meta[name="description"]', 'content'));
        var metaSummary = [meta.ogDescription, metaDescription, meta.ogTitle].join(' ');
        if (metaDescription) {
          caption = metaDescription.indexOf(':') >= 0 ? metaDescription.split(':').slice(1).join(':').trim() : metaDescription;
          caption = caption.replace(/^"|"$/g, '');
          caption = caption.replace(/"\.$/, '').trim();
        }
        if (!caption) caption = text('article h1');
        if (!caption) caption = text('article ul h1');
        if (!caption) caption = text('article ul li h1');

        var author = '';
        var authorMatch = metaSummary.match(/-\\s+([A-Za-z0-9._]+)\\s+on\\s+[A-Z][a-z]+\\s+\\d{1,2},\\s+\\d{4}:/);
        if (authorMatch) author = clean(authorMatch[1]);
        if (!author) {
          authorMatch = metaSummary.match(/^([A-Za-z0-9._]+)\\s+on\\s+Instagram:/);
          if (authorMatch) author = clean(authorMatch[1]);
        }
        if (!author) {
          authorMatch = metaSummary.match(/\\(@([^)]+)\\)/);
          if (authorMatch) author = clean(authorMatch[1]);
        }
        if (!author) {
          authorMatch = meta.canonicalUrl.match(/instagram\\.com\\/([A-Za-z0-9._-]+)\\/(?:reel|p|tv)\\//i);
          if (authorMatch) author = clean(authorMatch[1]);
        }
        if (!author) author = text('header a[href^="/"]');
        if (!author) author = text('article header a[href^="/"]');
        if (!author) {
          var links = document.querySelectorAll('a[href^="/"]');
          for (var i = 0; i < links.length; i++) {
            var href = clean(links[i].getAttribute('href'));
            var match = href.match(/^\\/([^/?#]+)\\/?$/);
            if (match && ['reels', 'reel', 'p', 'explore', 'accounts'].indexOf(match[1]) === -1) {
              author = match[1];
              break;
            }
          }
        }

        var likes = 0;
        var comments = 0;
        var takenAt = '';
        function parseCount(raw) {
          var value = clean(raw).replace(/,/g, '').toLowerCase();
          var m = value.match(/([\\d.]+)\\s*([kmb])?/);
          if (!m) return 0;
          var base = parseFloat(m[1]);
          var suffix = m[2] || '';
          var mult = suffix === 'k' ? 1000 : (suffix === 'm' ? 1000000 : (suffix === 'b' ? 1000000000 : 1));
          return Math.round((isNaN(base) ? 0 : base) * mult);
        }
        var countsMatch = metaSummary.match(/([\\d.,]+\\s*[kmb]?)\\s+likes,\\s+([\\d.,]+\\s*[kmb]?)\\s+comments/i);
        if (countsMatch) {
          likes = parseCount(countsMatch[1]);
          comments = parseCount(countsMatch[2]);
        }
        var dateMatch = metaSummary.match(/\\s+on\\s+([A-Z][a-z]+\\s+\\d{1,2},\\s+\\d{4})(?::|\\s)/);
        if (dateMatch) {
          var parsed = new Date(dateMatch[1]);
          if (!isNaN(parsed.getTime())) takenAt = parsed.toISOString();
        }
        var type = videoUrls.length > 0 ? 'reel' : fallbackType;

        return [{
          shortcode: shortcode,
          type: type,
          author: author,
          caption: caption,
          taken_at: takenAt,
          likes: likes,
          comments: comments,
          url: window.location.href,
          image_urls: imageUrls,
          video_urls: videoUrls,
          media_count: imageUrls.length + videoUrls.length,
        }];
      })()
    `);

    if (!Array.isArray(detail) || detail.length === 0) {
      throw new Error('Failed to read Instagram post');
    }

    return detail;
  },
});
