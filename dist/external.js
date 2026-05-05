import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync, execSync, execFileSync } from 'node:child_process';
import yaml from 'js-yaml';
import chalk from 'chalk';
import { log } from './logger.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
function getUserRegistryPath() {
    const home = os.homedir();
    return path.join(home, '.opencli', 'external-clis.yaml');
}
export function loadExternalClis() {
    const configs = new Map();
    // 1. Load built-in
    const builtinPath = path.resolve(__dirname, 'external-clis.yaml');
    try {
        if (fs.existsSync(builtinPath)) {
            const raw = fs.readFileSync(builtinPath, 'utf8');
            const parsed = (yaml.load(raw) || []);
            for (const item of parsed)
                configs.set(item.name, item);
        }
    }
    catch (err) {
        log.warn(`Failed to parse built-in external-clis.yaml: ${err.message}`);
    }
    // 2. Load user custom
    const userPath = getUserRegistryPath();
    try {
        if (fs.existsSync(userPath)) {
            const raw = fs.readFileSync(userPath, 'utf8');
            const parsed = (yaml.load(raw) || []);
            for (const item of parsed) {
                configs.set(item.name, item); // Overwrite built-in if duplicated
            }
        }
    }
    catch (err) {
        log.warn(`Failed to parse user external-clis.yaml: ${err.message}`);
    }
    return Array.from(configs.values()).sort((a, b) => a.name.localeCompare(b.name));
}
export function isBinaryInstalled(binary) {
    try {
        const isWindows = os.platform() === 'win32';
        execFileSync(isWindows ? 'where' : 'which', [binary], { stdio: 'ignore' });
        return true;
    }
    catch {
        return false;
    }
}
export function getInstallCmd(installConfig) {
    if (!installConfig)
        return null;
    const platform = os.platform();
    if (platform === 'darwin' && installConfig.mac)
        return installConfig.mac;
    if (platform === 'linux' && installConfig.linux)
        return installConfig.linux;
    if (platform === 'win32' && installConfig.windows)
        return installConfig.windows;
    if (installConfig.default)
        return installConfig.default;
    return null;
}
export function installExternalCli(cli) {
    if (!cli.install) {
        console.error(chalk.red(`No auto-install command configured for '${cli.name}'.`));
        console.error(`Please install '${cli.binary}' manually.`);
        return false;
    }
    const cmd = getInstallCmd(cli.install);
    if (!cmd) {
        console.error(chalk.red(`No install command for your platform (${os.platform()}) for '${cli.name}'.`));
        if (cli.homepage)
            console.error(`See: ${cli.homepage}`);
        return false;
    }
    console.log(chalk.cyan(`🔹 '${cli.name}' is not installed. Auto-installing...`));
    console.log(chalk.dim(`$ ${cmd}`));
    try {
        execSync(cmd, { stdio: 'inherit' });
        console.log(chalk.green(`✅ Installed '${cli.name}' successfully.\n`));
        return true;
    }
    catch (err) {
        console.error(chalk.red(`❌ Failed to install '${cli.name}': ${err.message}`));
        return false;
    }
}
export function executeExternalCli(name, args, preloaded) {
    const configs = preloaded ?? loadExternalClis();
    const cli = configs.find((c) => c.name === name);
    if (!cli) {
        throw new Error(`External CLI '${name}' not found in registry.`);
    }
    // 1. Check if installed
    if (!isBinaryInstalled(cli.binary)) {
        // 2. Try to auto install
        const success = installExternalCli(cli);
        if (!success) {
            process.exitCode = 1;
            return;
        }
    }
    // 3. Passthrough execution with stdio inherited
    const result = spawnSync(cli.binary, args, { stdio: 'inherit' });
    if (result.error) {
        console.error(chalk.red(`Failed to execute '${cli.binary}': ${result.error.message}`));
        process.exitCode = 1;
        return;
    }
    if (result.status !== null) {
        process.exitCode = result.status;
    }
}
export function registerExternalCli(name, opts) {
    const userPath = getUserRegistryPath();
    const configDir = path.dirname(userPath);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    let items = [];
    if (fs.existsSync(userPath)) {
        try {
            const raw = fs.readFileSync(userPath, 'utf8');
            items = (yaml.load(raw) || []);
        }
        catch {
            // Ignore
        }
    }
    const existingIndex = items.findIndex((c) => c.name === name);
    const newItem = {
        name,
        binary: opts?.binary || name,
    };
    if (opts?.description)
        newItem.description = opts.description;
    if (opts?.install)
        newItem.install = { default: opts.install };
    if (existingIndex >= 0) {
        items[existingIndex] = { ...items[existingIndex], ...newItem };
        console.log(chalk.green(`Updated '${name}' in user registry.`));
    }
    else {
        items.push(newItem);
        console.log(chalk.green(`Registered '${name}' in user registry.`));
    }
    const dump = yaml.dump(items, { indent: 2, sortKeys: true });
    fs.writeFileSync(userPath, dump, 'utf8');
    console.log(chalk.dim(userPath));
}
