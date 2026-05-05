import * as fs from 'node:fs';
import { cli, Strategy } from '../../registry.js';
function makeScreenshotCommand(site) {
    return cli({
        site,
        name: 'screenshot',
        description: `Capture a snapshot of the current ${site} window (DOM + Accessibility tree)`,
        domain: 'localhost',
        strategy: Strategy.UI,
        browser: true,
        args: [
            { name: 'output', required: false, help: `Output file path (default: /tmp/${site}-snapshot.txt)` },
        ],
        columns: ['Status', 'File'],
        func: async (page, kwargs) => {
            const outputPath = kwargs.output || `/tmp/${site}-snapshot.txt`;
            // Get both the accessibility snapshot and the raw DOM HTML
            const snap = await page.snapshot({ compact: true });
            const html = await page.evaluate('document.documentElement.outerHTML');
            const htmlPath = outputPath.replace(/\.\w+$/, '') + '-dom.html';
            const snapPath = outputPath.replace(/\.\w+$/, '') + '-a11y.txt';
            fs.writeFileSync(htmlPath, html);
            fs.writeFileSync(snapPath, typeof snap === 'string' ? snap : JSON.stringify(snap, null, 2));
            return [
                { Status: 'Success', File: htmlPath },
                { Status: 'Success', File: snapPath },
            ];
        },
    });
}
export const screenshotCursor = makeScreenshotCommand('cursor');
