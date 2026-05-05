/**
 * Page abstraction — implements IPage by sending commands to the daemon.
 *
 * All browser operations are ultimately 'exec' (JS evaluation via CDP)
 * plus a few native Chrome Extension APIs (tabs, cookies, navigate).
 *
 * IMPORTANT: After goto(), we remember the tabId returned by the navigate
 * action and pass it to all subsequent commands. This avoids the issue
 * where resolveTabId() in the extension picks a chrome:// or
 * chrome-extension:// tab that can't be debugged.
 */
import { formatSnapshot } from '../snapshotFormatter.js';
import { sendCommand } from './daemon-client.js';
import { wrapForEval } from './utils.js';
import { clickJs, typeTextJs, pressKeyJs, waitForTextJs, scrollJs, autoScrollJs, networkRequestsJs, } from './dom-helpers.js';
/**
 * Page — implements IPage by talking to the daemon via HTTP.
 */
export class Page {
    workspace;
    constructor(workspace = 'default') {
        this.workspace = workspace;
    }
    /** Active tab ID, set after navigate and used in all subsequent commands */
    _tabId;
    /** Helper: spread tabId into command params if we have one */
    _tabOpt() {
        return this._tabId !== undefined ? { tabId: this._tabId } : {};
    }
    _workspaceOpt() {
        return { workspace: this.workspace };
    }
    async goto(url, options) {
        const result = await sendCommand('navigate', {
            url,
            ...this._workspaceOpt(),
            ...this._tabOpt(),
        });
        // Remember the tabId for subsequent exec calls
        if (result?.tabId) {
            this._tabId = result.tabId;
        }
        // Post-load settle: the extension already waits for tab.status === 'complete',
        // but SPA frameworks (React/Vue) need extra time to render after DOM load.
        if (options?.waitUntil !== 'none') {
            const settleMs = options?.settleMs ?? 1000;
            await new Promise(resolve => setTimeout(resolve, settleMs));
        }
    }
    /** Close the automation window in the extension */
    async closeWindow() {
        try {
            await sendCommand('close-window', { ...this._workspaceOpt() });
        }
        catch {
            // Window may already be closed or daemon may be down
        }
    }
    async evaluate(js) {
        const code = wrapForEval(js);
        return sendCommand('exec', { code, ...this._workspaceOpt(), ...this._tabOpt() });
    }
    async getCookies(opts = {}) {
        const result = await sendCommand('cookies', { ...this._workspaceOpt(), ...opts });
        return Array.isArray(result) ? result : [];
    }
    async snapshot(opts = {}) {
        const maxDepth = Math.max(1, Math.min(Number(opts.maxDepth) || 50, 200));
        const code = `
      (async () => {
        function buildTree(node, depth) {
          if (depth > ${maxDepth}) return '';
          const role = node.getAttribute?.('role') || node.tagName?.toLowerCase() || 'generic';
          const name = node.getAttribute?.('aria-label') || node.getAttribute?.('alt') || node.textContent?.trim().slice(0, 80) || '';
          const isInteractive = ['a', 'button', 'input', 'select', 'textarea'].includes(node.tagName?.toLowerCase()) || node.getAttribute?.('tabindex') != null;

          ${opts.interactive ? 'if (!isInteractive && !node.children?.length) return "";' : ''}

          let indent = '  '.repeat(depth);
          let line = indent + role;
          if (name) line += ' "' + name.replace(/"/g, '\\\\"') + '"';
          if (node.tagName?.toLowerCase() === 'a' && node.href) line += ' [' + node.href + ']';
          if (node.tagName?.toLowerCase() === 'input') line += ' [' + (node.type || 'text') + ']';

          let result = line + '\\n';
          if (node.children) {
            for (const child of node.children) {
              result += buildTree(child, depth + 1);
            }
          }
          return result;
        }
        return buildTree(document.body, 0);
      })()
    `;
        const raw = await sendCommand('exec', { code, ...this._workspaceOpt(), ...this._tabOpt() });
        if (opts.raw)
            return raw;
        if (typeof raw === 'string')
            return formatSnapshot(raw, opts);
        return raw;
    }
    async click(ref) {
        const code = clickJs(ref);
        await sendCommand('exec', { code, ...this._workspaceOpt(), ...this._tabOpt() });
    }
    async typeText(ref, text) {
        const code = typeTextJs(ref, text);
        await sendCommand('exec', { code, ...this._workspaceOpt(), ...this._tabOpt() });
    }
    async pressKey(key) {
        const code = pressKeyJs(key);
        await sendCommand('exec', { code, ...this._workspaceOpt(), ...this._tabOpt() });
    }
    async wait(options) {
        if (typeof options === 'number') {
            await new Promise(resolve => setTimeout(resolve, options * 1000));
            return;
        }
        if (options.time) {
            await new Promise(resolve => setTimeout(resolve, options.time * 1000));
            return;
        }
        if (options.text) {
            const timeout = (options.timeout ?? 30) * 1000;
            const code = waitForTextJs(options.text, timeout);
            await sendCommand('exec', { code, ...this._workspaceOpt(), ...this._tabOpt() });
        }
    }
    async tabs() {
        return sendCommand('tabs', { op: 'list', ...this._workspaceOpt() });
    }
    async closeTab(index) {
        await sendCommand('tabs', { op: 'close', ...this._workspaceOpt(), ...(index !== undefined ? { index } : {}) });
    }
    async newTab() {
        await sendCommand('tabs', { op: 'new', ...this._workspaceOpt() });
    }
    async selectTab(index) {
        await sendCommand('tabs', { op: 'select', index, ...this._workspaceOpt() });
    }
    async networkRequests(includeStatic = false) {
        const code = networkRequestsJs(includeStatic);
        return sendCommand('exec', { code, ...this._workspaceOpt(), ...this._tabOpt() });
    }
    /**
     * Console messages are not available in lightweight daemon mode.
     * Would require CDP Runtime.consoleAPICalled event listener.
     * @returns Always returns empty array.
     */
    async consoleMessages(_level = 'info') {
        return [];
    }
    /**
     * Capture a screenshot via CDP Page.captureScreenshot.
     * @param options.format - 'png' (default) or 'jpeg'
     * @param options.quality - JPEG quality 0-100
     * @param options.fullPage - capture full scrollable page
     * @param options.path - save to file path (returns base64 if omitted)
     */
    async screenshot(options = {}) {
        const base64 = await sendCommand('screenshot', {
            ...this._workspaceOpt(),
            format: options.format,
            quality: options.quality,
            fullPage: options.fullPage,
            ...this._tabOpt(),
        });
        if (options.path) {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const dir = path.dirname(options.path);
            await fs.promises.mkdir(dir, { recursive: true });
            await fs.promises.writeFile(options.path, Buffer.from(base64, 'base64'));
        }
        return base64;
    }
    async scroll(direction = 'down', amount = 500) {
        const code = scrollJs(direction, amount);
        await sendCommand('exec', { code, ...this._workspaceOpt(), ...this._tabOpt() });
    }
    async autoScroll(options = {}) {
        const times = options.times ?? 3;
        const delayMs = options.delayMs ?? 2000;
        const code = autoScrollJs(times, delayMs);
        await sendCommand('exec', { code, ...this._workspaceOpt(), ...this._tabOpt() });
    }
    async installInterceptor(pattern) {
        const { generateInterceptorJs } = await import('../interceptor.js');
        // Must use evaluate() so wrapForEval() converts the arrow function into an IIFE;
        // sendCommand('exec') sends the code as-is, and CDP never executes a bare arrow.
        await this.evaluate(generateInterceptorJs(JSON.stringify(pattern), {
            arrayName: '__opencli_xhr',
            patchGuard: '__opencli_interceptor_patched',
        }));
    }
    async getInterceptedRequests() {
        const { generateReadInterceptedJs } = await import('../interceptor.js');
        // Same as installInterceptor: must go through evaluate() for IIFE wrapping
        const result = await this.evaluate(generateReadInterceptedJs('__opencli_xhr'));
        return result || [];
    }
}
// (End of file)
