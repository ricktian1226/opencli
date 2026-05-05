import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { cli, Strategy } from '../../registry.js';
function splitParagraphs(text) {
    return String(text || '')
        .trim()
        .split(/\r?\n\s*\r?\n+/)
        .map((block) => block.trim())
        .filter(Boolean);
}
function splitLines(text) {
    return String(text || '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}
function hasCjk(text) {
    return /[\u3400-\u9fff]/.test(String(text || ''));
}
function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, ''));
}
function escapeHtml(input) {
    return String(input || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function parseCaptionFile(raw) {
    const blocks = splitParagraphs(raw);
    if (blocks.length === 0)
        return { caption: '', captionZh: '' };
    if (blocks.length === 1) {
        const lines = splitLines(raw);
        if (lines.length >= 2) {
            const midpoint = Math.ceil(lines.length / 2);
            return {
                caption: lines.slice(0, midpoint).join('\n\n').trim(),
                captionZh: lines.slice(midpoint).join('\n\n').trim(),
            };
        }
        return { caption: blocks[0], captionZh: '' };
    }
    const midpoint = Math.ceil(blocks.length / 2);
    return {
        caption: blocks.slice(0, midpoint).join('\n\n').trim(),
        captionZh: blocks.slice(midpoint).join('\n\n').trim(),
    };
}
function joinBilingualParagraphs(original, translated) {
    const originalBlocks = splitParagraphs(original);
    const translatedBlocks = splitParagraphs(translated);
    const count = Math.max(originalBlocks.length, translatedBlocks.length, 1);
    const lines = [];
    for (let index = 0; index < count; index += 1) {
        lines.push(originalBlocks[index] || '');
        lines.push('');
        lines.push(translatedBlocks[index] || '');
        if (index !== count - 1)
            lines.push('', '');
    }
    return lines.join('\n').trimEnd() + '\n';
}
async function sleep(seconds) {
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
function translateBlockWithCurl(text) {
    const queryUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
    const curlBinary = process.platform === 'win32' ? 'curl.exe' : 'curl';
    const result = spawnSync(curlBinary, ['-L', queryUrl], {
        stdio: 'pipe',
        encoding: 'utf-8',
    });
    if (result.status !== 0 || !result.stdout)
        return '';
    try {
        const data = JSON.parse(result.stdout);
        return Array.isArray(data?.[0]) ? data[0].map((item) => item?.[0] || '').join('').trim() : '';
    }
    catch {
        return '';
    }
}
async function translateParagraphs(page, text) {
    const blocks = splitParagraphs(text);
    if (blocks.length === 0)
        return '';
    const translatedBlocks = [];
    let backendUnavailable = false;
    for (const block of blocks) {
        if (backendUnavailable)
            return '';
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
                if (translatedText && translatedText !== block.trim())
                    break;
            }
            catch {
                translatedText = '';
            }
            if (!translatedText) {
                translatedText = translateBlockWithCurl(block);
                if (translatedText && translatedText !== block.trim())
                    break;
            }
            if (attempt < 2)
                await sleep(0.35 * (attempt + 1));
        }
        if (!translatedText) {
            backendUnavailable = true;
            return '';
        }
        translatedBlocks.push(translatedText);
        await sleep(0.35);
    }
    return translatedBlocks.join('\n\n').trim();
}
function renderParagraph(text, translated) {
    if (!text)
        return '';
    const style = translated
        ? 'margin:0; font-size:15px; line-height:1.9; color:#0f172a; text-align:justify;'
        : 'margin:0; font-size:15px; line-height:1.9; color:#1f2937; text-align:justify;';
    return `<p style="${style}">${escapeHtml(text).replace(/\r?\n/g, '<br/>')}</p>`;
}
function renderBilingualBlocks(original, translated) {
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
  </p>`
            : '';
        return `
<section style="margin:0 0 22px;">
  ${originalBlock ? `<div style="margin:0 0 10px;">${renderParagraph(originalBlock, false)}</div>` : ''}
  ${translatedHtml}
</section>`.trim();
    }).join('\n');
}
function formatDate(value) {
    if (!value)
        return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return String(value);
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
    <p style="margin:0 0 14px; text-align:center;">
      <span style="display:inline-block; padding:0 0 8px; font-size:28px; line-height:1; font-weight:700; color:#16a34a; border-bottom:3px solid #16a34a;">${index}</span>
    </p>
    <p style="margin:0 0 12px; text-align:center;">
      <span style="display:inline-block; padding:8px 18px 10px 14px; background:#111111; color:#ffffff; font-size:24px; line-height:1.25; font-weight:700;">
        <span style="display:inline-block; width:4px; height:24px; margin-right:12px; vertical-align:-3px; background:#ffffff;"></span>${escapeHtml(post.username || post.author || 'instagram')}
      </span>
    </p>
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
function refreshWeixinForDir(inputDir) {
    const dirNames = fs.readdirSync(inputDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((name) => fs.existsSync(path.join(inputDir, name, 'links.json')))
        .sort();
    const rootArticles = [];
    for (const dirName of dirNames) {
        const dir = path.join(inputDir, dirName);
        const post = readJson(path.join(dir, 'links.json'));
        const localCaption = parseCaptionFile(fs.readFileSync(path.join(dir, 'caption.txt'), 'utf-8').replace(/^\uFEFF/, ''));
        post.caption = localCaption.caption || post.caption || '';
        post.captionZh = localCaption.captionZh || post.captionZh || '';
        const html = wrapHtml(`${post.username || post.author || dirName} - ${post.shortcode || dirName}`, [renderArticle(post, 1)]);
        fs.writeFileSync(path.join(dir, 'weixin.html'), html, 'utf-8');
        rootArticles.push(renderArticle(post, rootArticles.length + 1, `./${dirName}/`));
    }
    if (rootArticles.length > 0) {
        fs.writeFileSync(path.join(inputDir, 'weixin.html'), wrapHtml('instagram archive', rootArticles), 'utf-8');
    }
    return dirNames.length;
}
cli({
    site: 'instagram',
    name: 'archive-retranslate',
    description: 'Retranslate local caption.txt files and regenerate downloads/weixin.html without re-fetching posts',
    strategy: Strategy.COOKIE,
    browser: true,
    domain: 'www.instagram.com',
    timeoutSeconds: 1800,
    args: [
        { name: 'input', type: 'string', required: true, help: 'Existing downloads directory, for example .\\downloads' },
    ],
    columns: ['input', 'updatedCaptions', 'status'],
    func: async (page, kwargs) => {
        const inputDir = path.resolve(String(kwargs.input || './downloads'));
        if (!fs.existsSync(inputDir) || !fs.statSync(inputDir).isDirectory()) {
            throw new Error(`Input directory not found: ${inputDir}`);
        }
        await page.goto('https://www.instagram.com/');
        await page.wait(2);
        const dirNames = fs.readdirSync(inputDir, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name)
            .filter((name) => fs.existsSync(path.join(inputDir, name, 'caption.txt')))
            .sort();
        let updatedCaptions = 0;
        let translationUnavailable = false;
        for (const dirName of dirNames) {
            const captionPath = path.join(inputDir, dirName, 'caption.txt');
            const raw = fs.readFileSync(captionPath, 'utf-8').replace(/^\uFEFF/, '');
            const { caption, captionZh } = parseCaptionFile(raw);
            if (!caption)
                continue;
            if (captionZh && hasCjk(captionZh))
                continue;
            if (translationUnavailable)
                continue;
            const translated = await translateParagraphs(page, caption);
            if (!translated || !hasCjk(translated)) {
                translationUnavailable = true;
                continue;
            }
            fs.writeFileSync(captionPath, joinBilingualParagraphs(caption, translated), 'utf-8');
            updatedCaptions += 1;
        }
        refreshWeixinForDir(inputDir);
        return [
            {
                input: inputDir,
                updatedCaptions,
                status: 'success',
            },
        ];
    },
});
