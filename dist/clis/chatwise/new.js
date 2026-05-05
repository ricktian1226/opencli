import { cli, Strategy } from '../../registry.js';
export const newCommand = cli({
    site: 'chatwise',
    name: 'new',
    description: 'Start a new conversation in ChatWise',
    domain: 'localhost',
    strategy: Strategy.UI,
    browser: true,
    args: [],
    columns: ['Status'],
    func: async (page) => {
        // ChatWise uses standard Electron shortcuts
        const isMac = process.platform === 'darwin';
        await page.pressKey(isMac ? 'Meta+N' : 'Control+N');
        await page.wait(1);
        return [{ Status: 'Success' }];
    },
});
