/**
 * Shell tab-completion support for opencli.
 *
 * Provides:
 *  - Shell script generators for bash, zsh, and fish
 *  - Dynamic completion logic that returns candidates for the current cursor position
 */
/**
 * Return completion candidates given the current command-line words and cursor index.
 *
 * @param words  - The argv after 'opencli' (words[0] is the first arg, e.g. site name)
 * @param cursor - 1-based position of the word being completed (1 = first arg)
 */
export declare function getCompletions(words: string[], cursor: number): string[];
export declare function bashCompletionScript(): string;
export declare function zshCompletionScript(): string;
export declare function fishCompletionScript(): string;
/**
 * Print the completion script for the requested shell.
 */
export declare function printCompletionScript(shell: string): void;
