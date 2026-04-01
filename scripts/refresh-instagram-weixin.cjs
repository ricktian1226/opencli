const fs = require('fs');
const path = require('path');

const root = process.cwd();
const downloadsDir = path.join(root, 'downloads');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, ''));
}

function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function splitParagraphs(text) {
  return String(text || '')
    .trim()
    .split(/\r?\n\s*\r?\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function parseCaptionFile(dir) {
  const captionPath = path.join(dir, 'caption.txt');
  if (!fs.existsSync(captionPath)) {
    return { caption: '', captionZh: '' };
  }

  const raw = fs.readFileSync(captionPath, 'utf8').replace(/^\uFEFF/, '');
  const blocks = splitParagraphs(raw);
  if (blocks.length === 0) {
    return { caption: '', captionZh: '' };
  }

  const original = [];
  const translated = [];
  for (let index = 0; index < blocks.length; index += 2) {
    original.push(blocks[index] || '');
    translated.push(blocks[index + 1] || '');
  }

  return {
    caption: original.join('\n\n').trim(),
    captionZh: translated.join('\n\n').trim(),
  };
}

function renderParagraph(text, translated) {
  if (!text) {
    return '<p style="margin:0; font-size:15px; line-height:1.9; color:#6b7280;">暂无内容</p>';
  }

  const style = translated
    ? 'margin:0; font-size:15px; line-height:1.9; color:#0f172a; text-align:justify;'
    : 'margin:0; font-size:15px; line-height:1.9; color:#1f2937; text-align:justify;';

  return `<p style="${style}">${escapeHtml(text).replace(/\r?\n/g, '<br/>')}</p>`;
}

function renderBilingualBlocks(original, translated) {
  const originalBlocks = splitParagraphs(original);
  const translatedBlocks = splitParagraphs(translated);
  const count = Math.max(originalBlocks.length, translatedBlocks.length, 1);

  return Array.from({ length: count }, (_, index) => {
    const originalBlock = originalBlocks[index] || '';
    const translatedBlock = translatedBlocks[index] || '';

    return `
<section style="margin:0 0 22px;">
  <div style="margin:0 0 10px;">
    ${renderParagraph(originalBlock, false)}
  </div>
  <div style="padding:16px 16px 2px; background:#f9fafb; border-left:4px solid #14b8a6; border-radius:8px;">
    ${renderParagraph(translatedBlock, true)}
  </div>
</section>`.trim();
  }).join('\n');
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return `${date.getFullYear()}&#24180;${String(date.getMonth() + 1).padStart(2, '0')}&#26376;${String(date.getDate()).padStart(2, '0')}&#26085;`;
}

function renderMedia(assetBase, assetFiles) {
  return assetFiles.map((file) => {
    const relative = `${assetBase}${file}`;
    if (/\.(mp4|webm|mov)$/i.test(file)) {
      return `<section style="margin:0 0 22px;"><video controls style="display:block; width:100%; max-width:100%; border-radius:12px; background:#000;" src="${escapeHtml(relative)}"></video></section>`;
    }
    return `<section style="margin:0 0 22px;"><img style="display:block; width:100%; height:auto; border-radius:12px;" src="${escapeHtml(relative)}" /></section>`;
  }).join('\n');
}

function renderArticle(post, index, assetBase = './') {
  const assetFiles = Array.isArray(post.local_assets) ? post.local_assets : [];

  return `
<article style="margin:0 0 36px; padding:28px 22px; background:#ffffff;">
  <section style="margin:0 0 20px;">
    <div style="margin:0 0 10px; text-align:center; font-size:28px; line-height:1; font-weight:700; color:#16a34a;">${index}</div>
    <div style="width:28px; height:3px; margin:0 auto 14px; background:#16a34a; border-radius:999px;"></div>
    <div style="margin:0 0 12px; text-align:center;">
      <div style="display:inline-block; padding:8px 18px 10px 14px; background:#111111; color:#ffffff; font-size:24px; line-height:1.25; font-weight:700;">
        <span style="display:inline-block; width:4px; height:24px; margin-right:12px; vertical-align:-3px; background:#ffffff;"></span>${escapeHtml(post.username || post.author || 'instagram')}
      </div>
    </div>
    <p style="margin:0; font-size:13px; line-height:1.8; color:#6b7280; text-align:center;">${formatDate(post.taken_at)}</p>
  </section>
  <section style="margin:0 0 22px;">
    ${renderBilingualBlocks(post.caption || '', post.captionZh || '')}
  </section>
  ${renderMedia(assetBase, assetFiles)}
</article>`.trim();
}

function wrapHtml(title, articles) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0; padding:0; background:#f3f4f6;">
  <main style="max-width:760px; margin:0 auto; padding:28px 14px 40px;">
${articles.join('\n<section style="height:18px;"></section>\n')}
  </main>
</body>
</html>
`;
}

if (!fs.existsSync(downloadsDir)) {
  console.log('No downloads directory found.');
  process.exit(0);
}

const dirs = fs.readdirSync(downloadsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => fs.existsSync(path.join(downloadsDir, name, 'links.json')))
  .sort();

const rootArticles = [];

for (const dirName of dirs) {
  const dir = path.join(downloadsDir, dirName);
  const post = readJson(path.join(dir, 'links.json'));
  const localCaption = parseCaptionFile(dir);
  post.caption = localCaption.caption || post.caption || '';
  post.captionZh = localCaption.captionZh || post.captionZh || '';
  const html = wrapHtml(`${post.username || post.author || dirName} - ${post.shortcode || dirName}`, [renderArticle(post, 1)]);
  fs.writeFileSync(path.join(dir, 'weixin.html'), html, 'utf8');
  rootArticles.push({ html: renderArticle(post, rootArticles.length + 1, `./${dirName}/`) });
}

if (rootArticles.length > 0) {
  fs.writeFileSync(path.join(downloadsDir, 'weixin.html'), wrapHtml('instagram archive', rootArticles.map((item) => item.html)), 'utf8');
}

console.log(`Refreshed ${dirs.length} weixin.html file(s).`);
