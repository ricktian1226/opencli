/**
 * arXiv adapter utilities.
 *
 * arXiv exposes a public Atom/XML API — no key required.
 * https://info.arxiv.org/help/api/index.html
 */
export declare const ARXIV_BASE = "https://export.arxiv.org/api/query";
export declare function arxivFetch(params: string): Promise<string>;
export interface ArxivEntry {
    id: string;
    title: string;
    authors: string;
    abstract: string;
    published: string;
    url: string;
}
/** Parse Atom XML feed into structured entries. */
export declare function parseEntries(xml: string): ArxivEntry[];
