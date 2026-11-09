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

## 1.3.1

- 增加独立的 normalizeOpeningTags 后处理：即使 beautify 把 `<img>` 属性和空行排乱，也会强制把属性缩进标签 +2、删除开标签内的空行、`>` 回到标签列。
- 打开/切换文档仍自动执行，Format 也走同一套兜底。

## 1.3.2

- 修复嵌入编辑器 assets 变更没有通知父 Notebook，导致新增/替换/删除图片不保存的问题。
- Reader 嵌入时使用 inline assets：插入图片转 data URL，直接保存在 HTML 里。
- 增加版本 query，避免 WebView2 缓存旧编辑器脚本。

## 1.4.0

- 源码默认关闭软换行：长 `src`/data URI 不再折到行号下面造成错位；需要时点 Wrap 开启。
- 修复嵌入模式 assets 新增/替换/删除通知父 Notebook；Reader 使用 inline data URL 保存图片。

## 1.5.0

- HTML_Reader 的图片改为外部 assets 文件：编辑器把图片发给父 Reader，Reader 通过宿主 host.file.save 写到 HTML 同目录 assets/，源码只写相对路径，不再内嵌 base64。
- 预览通过 bookAssetsOrigin（原文件目录虚拟域名）解析相对图片。

## 1.5.1

- 外部 assets 模式下不再把源里的 assets/... 误报为 Missing；Assets 标签在 Reader external 模式下隐藏。

## 1.6.0

- CSS 标签页新增 existing rule 选择器：下拉选择所有 <style> 规则，自动填入 selector/declarations；Apply 直接修改对应 style 块，不再只写 managed block。
- CSS 规则列表显示所有 style 规则，点击即可加载编辑。

## 1.7.0

- CSS 标签页改为逐条属性行编辑：选中规则后每个 declaration 显示为 property + value 输入行，可增删属性；Apply 写回对应 style 规则，和 Style 标签页的逐项编辑一致。

## 1.8.0

- CSS 标签页完全重做：规则列表+筛选、选中规则、逐条属性行、property/value 补全（自定义 autocomplete）、新增/删除规则；布局与 Style 标签页统一。
- 自动补全弹层在下方空间不足或属性行时向上展开，避免挡住 Apply。

## 1.9.0

- CSS 标签页收束为单一 selector 下拉：选择后显示该 selector 的 property 行，可新增/删除/改值/Apply。
- 去掉规则列表、New rule、规则筛选、Managed/Advanced 等杂乱入口。
- 属性/值补全保留。

## 1.10.0

- selector 下拉加入所有默认 HTML 标签。
- 自动检测 DOM class：.class、tag.class、父子/后代链（.a .b、.a > .b）、三级链。
- 支持多 selector 规则（.a, .b）作为完整条目选中，编辑属性时保留逗号列表。
- 选中未存在的 selector（标签/class）后编辑属性，Apply 会自动创建对应规则。

## 1.11.0

- CSS property/value 补全改回原生 datalist，不再用遮挡界面的自绘大弹层。
- Assets 标签在 external 模式不再隐藏：显示 HTML 引用的 assets/ 外部文件卡片，支持预览（bookAssetsOrigin）和 Copy path。
- Assets 顶部说明根据 package/external/inline 动态变化；package 模式仍显示 .lyrnb 内资产。

## 1.12.0

- CSS 声明区完全照搬 Style 标签页：深色 property 搜索 + 深色补全弹层 + inline-style-row 属性行（属性标签、值输入、×）。
- 移除原生 datalist 白底弹层。
- 属性搜索选中后添加一行，值输入用同一套深色补全；Apply 写回 selector 的 CSS 规则。
- Assets 标签在 external 模式显示 assets/ 引用卡片；package 模式显示 .lyrnb 内资产。

## 1.13.0

- CSS 值补全只在输入时展开，点击/聚焦不再立刻弹大列表。
- 值补全固定向下展开，不再出现向上弹出的“上拉框”。
- 属性搜索域仍保持和 Style 一致的深色补全。

## 1.14.0

- 多 selector 规则（.a, .b）作为一个下拉项显示，标签归一化为单行；选中后编辑属性，Apply 保留逗号列表，不会拆成单 selector。
- CSS 格式化不再把 `.a, .b` 拆成多行：selector_separator_newline=false + 逗号空白归一化。

## 1.15.0

- 右栏可直接组合多个 class/tag 创建共享 CSS：从 selector 下拉依次选择 .card、.title，形成 chips；编辑属性后 Apply 生成 `.card, .title { ... }`。
- 已有规则选中后 chips 显示其 selector 列表；继续加 selector 可扩展该规则。
- Apply 移到面板顶部，避免补全弹层遮挡。

## 1.16.0

- 编辑预览不再强制注入 body 字体/边距/颜色等基础样式，只保留 img/video/canvas/svg 的 max-width:100% 约束。
- Reader 阅读模式也注入同一 image 约束，读/编辑图片尺寸一致。
- 用户 HTML 的 body width/padding/font 在两种模式都按原样生效。

## 1.17.0

- 源码自动补全：HTML 标签/属性/class、id、href、src 值；CSS 属性/值；JS 基础上 `.` 补全（Ctrl+Space 仍可用）。
- 图片拖拽到左侧源码区、粘贴剪贴板图片直接插入（Notebook package / Reader external 均走现有资产流程）。
- Assets 删除同步移除所有笔记里的 <img> 引用并通知父级保存；修复孤立的 img 标签。

## 1.17.1

- 预览 iframe 增加 allow="autoplay"，sandbox 与阅读模式对齐；背景视频在编辑预览可自动播放。


## 1.17.2

- Dev Tool 新增 Console 标签：捕获预览 iframe 的 console.log/info/warn/error/debug、JS 运行时错误、unhandled rejection、资源加载失败（img/video/audio/source/link/script/iframe）。
- 资源失败条目带 `data-lyra-src`，点击跳到对应源码行；JS 错误显示 stack 首行。
- 计数徽标；Clear 清空；最多保留 200 条。
- 编辑器缓存版本 281。

## 1.17.3

- CSS 面板新增自定义 selector 输入：支持伪类/属性选择器，可加入组合 selector 后 Apply。
- 缓存 282。

## 1.17.4

- HTML 语法着色按标签类别与嵌套深度区分：div 等 block 依层级循环绿/青/紫/橙/蓝/珊瑚。
- p/span 等文本标签改为粉色，与属性值（黄色）、属性名（绿色）区分。
- 缓存 283。

## 1.17.5

- 光标位于某元素内部/标签上时，自动高亮匹配的起止标签对（同色系浅色背景+虚线下划线）。
- 缓存 284。

## 1.17.6

- 匹配标签高亮只给标签本身加背景，不改变文字颜色；关闭整行 active-line 底色。
- Assets 外部资源卡片无缩略图时跨满整栏，长路径不再挤在 58px 首列。
- 缓存 285。

## 1.17.7

- 源码查找/替换：Ctrl+F / Ctrl+H，区分大小写，全部命中高亮，上下切换，替换当前/全部。
- 缓存 286。

## 1.17.8

- Assets 外部资源支持 Replace / Rename / Delete；通过宿主 host.file.rename/delete 操作并同步改写 HTML 引用。
- 需要主程序 1.4.8+；缓存 286。

## 1.18.0

- 新增 6 套编辑器配色：天依蓝 / 深空紫 / 森林绿 / 暖阳橙 / 樱花粉 / 极简白。
- 顶栏选择并持久化到 localStorage；含浅色语法配色。
- 缓存 288。

## 1.18.1

- 每套主题单独定义 CodeMirror 选中文本背景色（含 focused）。
- 缓存 289。

## 1.19.0

- 项目模式配套：baseHref 可指向当前 HTML 所在子目录；外部 assets 操作路径由 Reader 按目录转发。
- 缓存 290。

## 1.19.1

- Inspect 按钮激活时使用主题 accent 实心高亮，明确显示开启状态。
- 其余按钮激活态统一为更协调的主题色。
- 缓存 291。

## 1.19.2

- 编辑器主题会同步给 Reader 外壳，文件树/工具栏/按钮统一配色。
- Responsive/100% 选择器改为主题面板色，与预览按钮统一。
- 缓存 292。

## 1.19.3

- 源码选中改为主题 accent 半透明色，明显可见；不同主题选中颜色不同。
- 缓存 293。

## 1.19.4

- 配对标签高亮只包住标签名（<div / </div>），不再覆盖整段属性。
- 配对标签高亮使用主题 accent 半透明色，随主题变化并更明显。
- 缓存 294。

## 1.19.5

- 配对标签只高亮最近一层配对，避免祖先标签一起亮造成满屏色块。
- 当前配对高亮使用更强主题 accent 背景。
- 缓存 295。

## 1.19.6

- 移除整行黑色 source-jump 条：cm-active-source-line 改为透明背景 + accent 左边条。
- 配对标签高亮保持只覆盖标签名 token。
- 缓存 296。

## 1.19.7

- 行内标签（span/a/b 等）改用独立主题色，与容器 div 区分。
- 配对标签高亮颜色改为取对应标签的语法颜色（容器/行内/媒体等分组），不再统一 accent。
- 缓存 297。
