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
