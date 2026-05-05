export interface CheckboxItem {
    label: string;
    value: string;
    checked: boolean;
    /** Optional status to display after the label */
    status?: string;
    statusColor?: 'green' | 'yellow' | 'red' | 'dim';
}
/**
 * Interactive multi-select checkbox prompt.
 *
 * Controls:
 *   ↑/↓ or j/k  — navigate
 *   Space        — toggle selection
 *   a            — toggle all
 *   Enter        — confirm
 *   q/Esc        — cancel (returns empty)
 */
export declare function checkboxPrompt(items: CheckboxItem[], opts?: {
    title?: string;
    hint?: string;
}): Promise<string[]>;
