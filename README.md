# HTML 编辑器层（HTML_Editor）

`kind: "layer"` 扩展，**没有独立 Tab、不单独开窗**。它被 HTML_Reader 或 Notebook 以 iframe 方式嵌入，提供三栏 HTML 编辑器：

- 左：CodeMirror HTML 源码
- 中：实时预览 + Inspect
- 右：Style / CSS / DOM / Assets

## 作为前置

```json
{
  "kind": "layer",
  "id": "html-editor"
}
```

HTML_Reader / Notebook 清单声明：

```json
{ "requires": ["html-editor"] }
```

宿主把所有扩展映射到固定虚拟域名，父扩展通过：

```text
https://lyra-extensions.local/html-editor/index.html?embedded=1
```

加载本层。**不要直接打开这个 URL。**

## postMessage 协议

父 → 编辑器：

```js
{ channel: "lyra-editor", type: "init", html, title, assets }
{ channel: "lyra-editor", type: "set-document", html, title, assets }
{ channel: "lyra-editor", type: "request-document" }
```

编辑器 → 父：

```js
{ channel: "lyra-editor", type: "ready" }
{ channel: "lyra-editor", type: "loaded", title }
{ channel: "lyra-editor", type: "change", html }
{ channel: "lyra-editor", type: "document", html }
{ channel: "lyra-editor", type: "assets", assets }
```

父扩展负责文件 / `.lyrnb` 包的最终保存；本层不调用 `host.workspace.save`。

## 能力

- HTML 源码高亮 / 补全 / 折叠 / 软换行
- 实时预览
- Inspect 顶层 overlay 高亮、Alt+Click 父级
- 全量 CSS 属性搜索 + inline style 编辑
- CSS 规则、DOM 树、Assets
- 格式化、光标与源码联动、flex 图片自适应
- 嵌入模式隐藏自身标题栏

## 许可证

GNU GPL v3.0。三方组件见 `THIRD_PARTY_NOTICES.md`。

## 1.0.1

- Format 先按块级标签断行：`img` 等标签不再粘在上一行。
- 多行属性统一缩进（标签 +2），`style` 内声明再 +2；`>` 回到标签列。
- `<style>` 内 CSS 自动换行/缩进。
- 按标签类别分色：文档结构（html/head/body）、style、block（div/section）、文本（h1/p/span）、媒体（img/video）、script。

## 1.1.0

- Preview 增加 50% / 75% / 100% / 125% / 150% 缩放。
- Inline style 的颜色属性增加系统取色器，取色立即写回源码。

## 1.2.0

- CSS 标签页新增 Style blocks：可直接在右栏编辑每个 `<style>` 块的内容，Apply 写回源码，支持 Format CSS、删除块、新增块。
- 工具栏新增 Wrap 开关：长 data URI 太多时可关闭软换行，改横向滚动。

## 1.3.0

- 打开文档 / 切换笔记 / 从 Reader 进入编辑模式时自动格式化一次：长属性、`<img>` 缩进、`style` 内 CSS 自动整理，不需要先手动点 Format。
- 自动格式化不标记文件为已修改；用户真正编辑或保存时才写回。
