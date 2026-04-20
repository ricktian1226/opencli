---
name: instagram-archive
description: "Instagram 原帖归档与公众号发布素材工作流。适用于：批量处理原帖链接、按博主批量归档最新 N 条帖子、下载素材到 downloads、生成 caption.txt / links.json / links.txt / weixin.html，以及刷新现有 weixin.html。"
---

# Instagram Archive

按下面顺序执行，默认不要把操作丢给用户手动处理。

## 1. 输入识别

- 优先支持“原帖链接列表”，每行一个 Instagram `post` 或 `reel` 链接。
- 也支持“单博主批量归档”模式：给出博主 ID 和帖子数量，按时间倒序抓取前 N 条帖子。
- 单博主模式统一使用：`instagram archive-singleup "popstantot" 50`
- 默认输出目录是仓库根目录下的 `downloads/`。

## 2. 产物要求

- 单条帖子目录固定包含：
  `downloads/<博主ID>/caption.txt`
  `downloads/<博主ID>/links.json`
  `downloads/<博主ID>/links.txt`
  `downloads/<博主ID>/weixin.html`
- 如果同一批次里同一博主有多条帖子，后续目录使用 `__2`、`__3` 递增后缀。
- 素材文件按序号命名，例如：
  `001.jpg`
  `002.jpg`
  `003.mp4`

## 3. 文件规范

- `caption.txt`
  英文原文和中文译文按段落对应。
  如果翻译失败，中文部分留空，不要用英文回填。
- `links.json`
  至少包含 `shortcode`、`username`、`taken_at`、`caption`、`captionZh`、`image_urls`、`video_urls`、`local_assets`。
- `links.txt`
  保存远程媒体链接，一行一个。
- `weixin.html`
  可直接复制到微信公众号编辑器。
  优先引用本地素材文件。
  如果中文为空，则不要渲染中文块。

## 4. 常用命令

- 批量归档链接列表：
  `node dist/main.js instagram archive archive.list --output .\\downloads -f json`
- 批量归档并导出 PDF：
  `node dist/main.js instagram archive archive.list --output .\\downloads --export-format pdf -f json`
- 单博主批量归档：
  `node dist/main.js instagram archive-singleup rebekah__leah 50 --output .\\downloads_singleup -f json`
- 基于现有 `caption.txt` 重建 `downloads/weixin.html`：
  `node dist/main.js instagram archive-retranslate --input .\\downloads`
- 单帖调试：
  `node dist/main.js instagram post <instagram-url> -f json`

## 5. 美丽印记

- 当用户输入：`来一条美丽印记`
- 直接生成一条英文短句，要求：
  英文
  散文风格
  不超过 10 个英文单词
- 同时附带中文翻译。
- 固定输出格式：
  `美丽印记，建议收藏 | {英文句子} | {中文翻译} | About Today 关于今天`

## 6. 验证步骤

- 检查目标目录是否生成：
  `caption.txt`
  `links.json`
  `links.txt`
  `weixin.html`
  至少一个本地素材文件
- 抽查 `weixin.html`：
  日期是否为 `YYYY年MM月DD日`
  是否引用本地 `001.jpg` / `001.mp4`
  中文为空时是否不展示中文块
- 改动代码后运行：
  `npm run typecheck`
  `npm run build`

## 7. 编码与稳定性

- 所有新写入文本文件统一使用 UTF-8。
- 读取 JSON 时先去掉 BOM。
- 如果终端显示乱码，优先相信文件实际内容，并用 Node 或 IDE 再验证，不要直接用乱码覆盖成品。
- 如果翻译接口频率过高，优先增加请求间隔和重试，不要修改其他归档逻辑。

## 8. 参考资料

- 需要查看完整目录规范、排错方式和工作流细节时，读取：
  [references/instagram.md](references/instagram.md)
