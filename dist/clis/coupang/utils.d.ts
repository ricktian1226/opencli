export interface CoupangSearchItem {
    rank: number;
    product_id: string;
    title: string;
    price: number | null;
    original_price: number | null;
    unit_price: string;
    discount_rate: number | null;
    rating: number | null;
    review_count: number | null;
    rocket: string;
    delivery_type: string;
    delivery_promise: string;
    seller: string;
    badge: string;
    category: string;
    url: string;
}
export declare function normalizeProductId(raw: unknown): string;
export declare function canonicalizeProductUrl(rawUrl: unknown, productId?: unknown): string;
export declare function normalizeSearchItem(raw: Record<string, unknown>, index: number): CoupangSearchItem;
export declare function dedupeSearchItems(items: CoupangSearchItem[]): CoupangSearchItem[];
export declare function sanitizeSearchItems(items: CoupangSearchItem[], limit: number): CoupangSearchItem[];
export declare function mergeSearchItems(base: CoupangSearchItem[], extra: CoupangSearchItem[], limit: number): CoupangSearchItem[];
