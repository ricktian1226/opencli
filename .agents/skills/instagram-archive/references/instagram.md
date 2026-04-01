# Instagram 批量归档工作流

这个参考文档沉淀当前仓库里 Instagram 相关的批量内容生成、素材下载和公众号排版流程。

## 目标

给定一个或多个 Instagram 原帖链接，自动完成：

1. 解析帖子正文、发布时间、作者、图片/视频链接。
2. 下载媒体素材到 `downloads/`。
3. 生成适合归档和发布的文本与结构化文件。
4. 输出可直接复制到微信公众号编辑器的 `weixin.html`。

## 输入格式

推荐输入为文本文件，每行一个链接，例如：

```text
https://www.instagram.com/p/DWSmveTiE8T/
https://www.instagram.com/p/DWPUHhIAkq_/
```

## 输出目录规范

默认输出到仓库根目录的 `downloads/`。

单条帖子归档目录：

```text
downloads/
  <username>/
    caption.txt
    links.json
    links.txt
    weixin.html
    001.jpg
    002.jpg
    003.mp4
```

说明：

- 目录名默认使用博主 ID。
- 如果同一批次内出现重名目录，后续目录使用 `__2`、`__3` 递增后缀。
- 素材文件名严格按序号命名。

## 文件约定

### caption.txt

- 按段落粒度组织。
- 一个英文段落后面紧跟一个中文段落。
- 便于后续人工编辑或二次发布。

### links.json

推荐字段：

```json
{
  "shortcode": "DWPUHhIAkq_",
  "username": "isabelhayn",
  "taken_at": "2026-03-23T19:49:46.000Z",
  "caption": "dream girl ...",
  "captionZh": "梦幻女孩 ...",
  "image_urls": ["https://..."],
  "video_urls": [],
  "local_assets": ["001.jpg", "002.jpg"]
}
```

### links.txt

- 保存原始远程媒体链接。
- 一行一个链接。
- 便于后续排查或改走其他下载链路。

### weixin.html

生成目标：

- 直接复制进微信公众号编辑器。
- 使用内联样式。
- 顶部展示黑底白字、居中的博主 ID。
- 日期居中显示，格式为 `YYYY年MM月DD日`。
- 正文中英文按段落一一对应。
- 图片或视频引用本地序号素材文件。

## 常用命令

### 1. 批量归档链接列表

```powershell
node dist/main.js instagram archive .\input.txt --output .\downloads -f json
```

### 2. 刷新所有公众号 HTML

```powershell
npm run refresh:instagram-weixin
```

### 3. 调试单条帖子

```powershell
node dist/main.js instagram post https://www.instagram.com/p/<shortcode>/ -f json
```

## 排错

### 1. Chrome 扩展未连接

现象：

- `Browser Extension is not connected`

处理：

- 打开 `chrome://extensions`
- 重新启用 `OpenCLI`
- 保持一个普通的 Instagram 页面打开

### 2. 素材下载失败

现象：

- Node 直连 CDN 报网络错误

处理：

- 保留 `links.json` 和 `links.txt`
- 优先尝试浏览器侧下载或 fallback 方案
- 下载成功后确保 `local_assets` 已写回

### 3. 中文或日期乱码

处理：

- 文件统一按 UTF-8 写入
- 读取 JSON 时去 BOM
- 重新执行：

```powershell
npm run refresh:instagram-weixin
```

## 关联实现

核心文件：

- `src/clis/instagram/archive.ts`
- `src/clis/instagram/post.ts`
- `src/clis/instagram/helpers.ts`
- `scripts/refresh-instagram-weixin.cjs`

验证命令：

```powershell
npm run typecheck
npm run build
```
