---
name: instagram-archive
description: "Instagram 原帖链接批量归档与公众号发布素材工作流。Use when Codex needs to: (1) 接收一个或多个 Instagram 原帖链接, (2) 批量提取帖子正文、发布时间与媒体链接, (3) 下载图片或视频素材到 downloads 目录, (4) 生成 caption.txt、links.json、links.txt、weixin.html, 或 (5) 刷新现有 downloads 下的微信公众号 HTML 成品。"
---

# Instagram Archive

按下面顺序执行，默认不要把操作丢给用户手动处理。

## 1. 识别输入

- 优先接受“原帖链接列表”，每行一个 Instagram `post` 或 `reel` 链接。
- 如果用户给的是博主和 offset，只在明确要求兼容旧流程时再使用旧逻辑；默认使用链接列表。
- 默认输出目录是仓库根目录下的 `downloads/`。

## 2. 生成内容

- 使用 `instagram archive` 命令批量处理链接列表。
- 目标产物固定为：
  - `downloads/<博主ID>/caption.txt`
  - `downloads/<博主ID>/links.json`
  - `downloads/<博主ID>/links.txt`
  - `downloads/<博主ID>/weixin.html`
- 多媒体素材直接下载到对应博主目录下。
- 素材文件名按序号命名，例如 `001.jpg`、`002.jpg`、`003.mp4`。

## 3. 结果要求

- `caption.txt`：
  - 英文原文与中文译文按段落一一对应。
  - 每个英文段落后紧跟一个中文段落。
- `links.json`：
  - 至少包含 `shortcode`、`username`、`taken_at`、`caption`、`captionZh`、`image_urls`、`video_urls`、`local_assets`。
- `weixin.html`：
  - 直接可复制到微信公众号编辑器。
  - 博主 ID 黑底白字并居中。
  - 日期居中，格式固定为 `YYYY年MM月DD日`。
  - 不显示“发布时间”“原帖链接”“素材来源”等额外字段。
  - 优先引用本地下载好的序号素材文件。

## 4. 常用命令

- 批量归档：
  - `node dist/main.js instagram archive <input-file> --output .\\downloads -f json`
- 刷新公众号 HTML：
  - `npm run refresh:instagram-weixin`
- 单条帖子调试：
  - `node dist/main.js instagram post <instagram-url> -f json`

## 5. 验证步骤

- 检查目标目录是否生成：
  - `caption.txt`
  - `links.json`
  - `links.txt`
  - `weixin.html`
  - 至少一个序号素材文件
- 抽查 `weixin.html`：
  - 日期是否为 `YYYY年MM月DD日`
  - 是否引用本地 `001.jpg` / `001.mp4`
  - 中文段落是否和英文段落配对
- 代码改动后运行：
  - `npm run typecheck`
  - `npm run build`

## 6. 编码与稳定性

- 所有新写入文本文件都使用 UTF-8。
- 读取 JSON 时先去掉 BOM。
- 如果终端显示乱码，优先相信文件实际内容，并用 Node/IDE 再验证，不要直接用乱码内容覆盖成品。

## 7. 参考文档

- 需要查看完整工作流、目录约定、排错方法时，读取 [references/instagram.md](references/instagram.md)。
