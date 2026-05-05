import { execSync } from 'node:child_process';
import { cli, Strategy } from '../../registry.js';
export const searchCommand = cli({
    site: 'feishu',
    name: 'search',
    description: 'Open Feishu global search and type a query (Cmd+K)',
    domain: 'localhost',
    strategy: Strategy.PUBLIC,
    browser: false,
    args: [{ name: 'query', required: true, positional: true, help: 'Search query' }],
    columns: ['Status'],
    func: async (page, kwargs) => {
        const query = kwargs.query;
        try {
            execSync("osascript -e 'tell application \"Lark\" to activate'");
            execSync("osascript -e 'delay 0.3'");
            // Feishu uses Cmd+K for global search (similar to Slack/Notion)
            execSync("osascript " +
                "-e 'tell application \"System Events\"' " +
                "-e 'keystroke \"k\" using command down' " +
                "-e 'delay 0.5' " +
                `-e 'keystroke ${JSON.stringify(query)}' ` +
                "-e 'end tell'");
            return [{ Status: `Searching for: ${query}` }];
        }
        catch (err) {
            return [{ Status: 'Error: ' + err.message }];
        }
    },
});
