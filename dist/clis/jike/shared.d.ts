/**
 * 即刻适配器公共定义
 *
 * JikePost 接口和 getPostData 函数在 feed.ts / search.ts 中复用，
 * 统一维护于此文件避免重复。
 */
export interface JikePost {
    author: string;
    content: string;
    likes: number;
    comments: number;
    time: string;
    url: string;
}
/**
 * 注入浏览器 evaluate 的 JS 函数字符串。
 * 从 React fiber 树中向上最多走 10 层，找到含 id 字段的 props.data。
 */
export declare const getPostDataJs: string;
