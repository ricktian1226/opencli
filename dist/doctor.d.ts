/**
 * opencli doctor — diagnose and fix browser connectivity.
 *
 * Simplified for the daemon-based architecture. No more token management,
 * MCP path discovery, or config file scanning.
 */
export type DoctorOptions = {
    fix?: boolean;
    yes?: boolean;
    live?: boolean;
    sessions?: boolean;
    cliVersion?: string;
};
export type ConnectivityResult = {
    ok: boolean;
    error?: string;
    durationMs: number;
};
export type DoctorReport = {
    cliVersion?: string;
    daemonRunning: boolean;
    extensionConnected: boolean;
    connectivity?: ConnectivityResult;
    sessions?: Array<{
        workspace: string;
        windowId: number;
        tabCount: number;
        idleMsRemaining: number;
    }>;
    issues: string[];
};
/**
 * Test connectivity by attempting a real browser command.
 */
export declare function checkConnectivity(opts?: {
    timeout?: number;
}): Promise<ConnectivityResult>;
export declare function runBrowserDoctor(opts?: DoctorOptions): Promise<DoctorReport>;
export declare function renderBrowserDoctorReport(report: DoctorReport): string;
