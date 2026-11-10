(function () {
  "use strict";
  const MONACO = window.MonacoTS;
  const ts = MONACO && MONACO.ts && (MONACO.ts.typescript || MONACO.ts);
  const LIB = MONACO && MONACO.libFileMap;

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function lineAt(text, index) {
    return (String(text || "").slice(0, Math.max(0, index)).match(/\n/g) || []).length + 1;
  }
  function lineStarts(text) {
    const starts = [0];
    for (let i = 0; i < text.length; i += 1) if (text[i] === "\n") starts.push(i + 1);
    return starts;
  }
  function scriptBlocks(source) {
    const blocks = [];
    const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(source))) {
      const attrs = m[1] || "";
      if (/\bsrc\s*=/i.test(attrs)) continue;
      const type = attrs.match(/\btype\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      const typeValue = String((type && (type[1] || type[2])) || "").toLowerCase();
      if (typeValue && !/javascript|module|ecmascript/.test(typeValue)) continue;
      const content = m[2] || "";
      if (!content.trim()) continue;
      const start = m.index + m[0].indexOf(">") + 1;
      const before = source.slice(0, start);
      const startLine = lineAt(source, start);
      const lastNl = before.lastIndexOf("\n");
      const startCh = start - (lastNl + 1);
      blocks.push({
        content: content,
        start: start,
        startLine: startLine,
        startCh: startCh,
        starts: lineStarts(content),
      });
    }
    return blocks;
  }
  function offsetToPos(block, offset) {
    const starts = block.starts;
    let lo = 0, hi = starts.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (starts[mid] <= offset) lo = mid + 1; else hi = mid - 1;
    }
    const line = Math.max(0, hi);
    return { line: line, ch: offset - starts[line] };
  }
  function posToOffset(block, pos) {
    const relLine = pos.line - (block.startLine - 1);
    if (relLine < 0 || relLine >= block.starts.length) return null;
    const ch = relLine === 0 ? pos.ch - block.startCh : pos.ch;
    if (ch < 0) return null;
    return block.starts[relLine] + Math.min(ch, (block.content.split("\n")[relLine] || "").length);
  }
  function makeService(block, index) {
    const fileName = "inline-script-" + index + ".js";
    const content = block.content;
    const libs = LIB || {};
    const host = {
      getCompilationSettings: () => ({ allowJs: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, lib: ["dom", "es2022", "dom.iterable", "scripthost"], noEmit: true, allowNonTsExtensions: true }),
      getScriptFileNames: () => [fileName],
      getScriptVersion: () => "1",
      getScriptSnapshot: (f) => {
        if (f === fileName) return ts.ScriptSnapshot.fromString(content);
        if (libs[f]) return ts.ScriptSnapshot.fromString(libs[f]);
        return undefined;
      },
      getCurrentDirectory: () => "",
      getDefaultLibFileName: () => "lib.d.ts",
      getScriptKind: () => ts.ScriptKind.JS,
      fileExists: (f) => f === fileName || !!libs[f],
      readFile: (f) => f === fileName ? content : libs[f],
      getNewLine: () => "\n",
    };
    return { fileName: fileName, service: ts.createLanguageService(host) };
  }
  function display(parts) {
    return (parts || []).map((p) => p.text || "").join("");
  }
  function docText(qi) {
    const pieces = [];
    if (qi.documentation) pieces.push(display(qi.documentation));
    for (const tag of qi.tags || []) {
      const body = tag.text ? display(tag.text) : "";
      pieces.push("@" + tag.name + (body ? " " + body : ""));
    }
    return pieces.filter(Boolean).join("\n");
  }

  function init(cm) {
    if (!cm || !ts) return;
    const card = document.getElementById("scriptHoverCard");
    const param = document.getElementById("scriptParamHint");
    let blocks = [];
    let sourceCache = null;
    let services = new Map();
    let hoverTimer = 0;

    function currentBlocks() {
      const source = cm.getValue();
      if (sourceCache !== source) {
        sourceCache = source;
        blocks = scriptBlocks(source);
        services = new Map();
      }
      return blocks;
    }
    function blockAt(pos) {
      for (let i = 0; i < currentBlocks().length; i += 1) {
        const block = blocks[i];
        const relative = pos.line - (block.startLine - 1);
        if (relative < 0 || relative >= block.starts.length) continue;
        const offset = posToOffset(block, pos);
        if (offset != null) return { block: block, index: i, offset: offset, relLine: relative };
      }
      return null;
    }
    function serviceFor(hit) {
      const key = hit.index;
      if (!services.has(key)) services.set(key, makeService(hit.block, hit.index));
      return services.get(key);
    }
    function wordAt(pos) {
      const line = cm.getLine(pos.line) || "";
      let a = pos.ch, b = pos.ch;
      while (a > 0 && /[\w$]/.test(line[a - 1])) a -= 1;
      while (b < line.length && /[\w$]/.test(line[b])) b += 1;
      if (a === b) return null;
      return { text: line.slice(a, b), from: { line: pos.line, ch: a }, to: { line: pos.line, ch: b } };
    }
    function hideHover() { clearTimeout(hoverTimer); if (card) card.hidden = true; }
    function showHover(event) {
      if (!card) return;
      clearTimeout(hoverTimer);
      let pos;
      try { pos = cm.coordsChar({ left: event.clientX, top: event.clientY }, "window"); } catch { return; }
      const hit = blockAt(pos);
      if (!hit) { hideHover(); return; }
      const word = wordAt(pos);
      if (!word) { hideHover(); return; }
      const handle = serviceFor(hit);
      let qi = null;
      try { qi = handle.service.getQuickInfoAtPosition(handle.fileName, posToOffset(hit.block, word.from)); } catch { }
      if (!qi) { hideHover(); return; }
      hoverTimer = setTimeout(() => {
        card.innerHTML = '<div class="source-hover-title"><span class="source-hover-kind">MONACO · TS</span><span class="source-hover-name">' + esc(word.text) + '</span></div>' +
          '<div class="source-hover-sig">' + esc(display(qi.displayParts)) + '</div>' +
          (docText(qi) ? '<div class="source-hover-doc">' + esc(docText(qi)) + '</div>' : "") +
          '<div class="source-hover-meta">内联脚本 · Ln ' + (pos.line + 1) + '</div>';
        card.hidden = false;
        let left = event.clientX + 16;
        let top = event.clientY + 16;
        if (left + 440 > window.innerWidth) left = window.innerWidth - 452;
        if (top + 160 > window.innerHeight) top = Math.max(12, event.clientY - 160);
        card.style.left = Math.max(8, left) + "px";
        card.style.top = Math.max(8, top) + "px";
      }, 180);
    }
    function hideParam() { if (param) param.hidden = true; }
    function updateParam() {
      if (!param) return;
      const pos = cm.getCursor();
      const hit = blockAt(pos);
      if (!hit) { hideParam(); return; }
      const handle = serviceFor(hit);
      let help = null;
      try { help = handle.service.getSignatureHelpItems(handle.fileName, hit.offset, {}); } catch { }
      if (!help || !help.items || !help.items.length) { hideParam(); return; }
      const item = help.items[0];
      const active = help.argumentIndex;
      const params = (item.parameters || []).map((p, i) => '<span class="' + (i === active ? "active" : "") + '">' + esc(display(p.displayParts)) + '</span>');
      const prefix = display(item.prefixDisplayParts);
      const suffix = display(item.suffixDisplayParts);
      param.innerHTML = esc(prefix) + params.join(", ") + esc(suffix);
      param.hidden = false;
      const cursor = cm.cursorCoords(null, "window");
      const wrap = cm.getWrapperElement().getBoundingClientRect();
      let left = cursor.left - wrap.left + 10;
      let top = cursor.bottom - wrap.top + 8;
      if (left + param.offsetWidth > wrap.width - 8) left = Math.max(8, wrap.width - param.offsetWidth - 8);
      if (top + param.offsetHeight > wrap.height - 8) top = Math.max(8, cursor.top - wrap.top - param.offsetHeight - 8);
      param.style.left = left + "px";
      param.style.top = top + "px";
    }
    function hint() {
      const pos = cm.getCursor();
      const hit = blockAt(pos);
      if (!hit) return null;
      const word = wordAt(pos);
      const handle = serviceFor(hit);
      let comp = null;
      try { comp = handle.service.getCompletionsAtPosition(handle.fileName, hit.offset, {}); } catch { }
      if (!comp || !comp.entries || !comp.entries.length) return null;
      const prefix = word ? word.text : "";
      const from = word ? word.from : pos;
      const seen = new Set();
      const list = [];
      for (const entry of comp.entries) {
        if (!entry.name || (prefix && !entry.name.toLowerCase().startsWith(prefix.toLowerCase())) || seen.has(entry.name)) continue;
        seen.add(entry.name);
        list.push({ text: entry.insertText || entry.name, displayText: entry.name + (entry.kind ? "  " + entry.kind : ""), className: "lyra-monaco-hint" });
      }
      return { list: list, from: from, to: pos };
    }
    function definitionAt(pos) {
      const hit = blockAt(pos);
      if (!hit) return null;
      const handle = serviceFor(hit);
      let defs = null;
      try { defs = handle.service.getDefinitionAtPosition(handle.fileName, hit.offset); } catch { }
      if (!defs || !defs.length) return null;
      const def = defs.find((d) => d.fileName === handle.fileName) || defs[0];
      if (def.fileName !== handle.fileName) return null;
      const p = offsetToPos(hit.block, def.textSpan.start);
      return { line: (hit.block.startLine - 1) + p.line, ch: (p.line === 0 ? hit.block.startCh : 0) + p.ch };
    }

    const wrap = cm.getWrapperElement();
    wrap.addEventListener("mousemove", showHover);
    wrap.addEventListener("mouseleave", hideHover);
    cm.on("scroll", hideHover);
    cm.on("change", () => { hideHover(); hideParam(); currentBlocks(); });
    cm.on("cursorActivity", () => { hideHover(); updateParam(); });
    cm.on("mousedown", (editor, event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      let pos;
      try { pos = cm.coordsChar({ left: event.clientX, top: event.clientY }, "window"); } catch { return; }
      const target = definitionAt(pos);
      if (!target) return;
      event.preventDefault();
      cm.setCursor({ line: target.line, ch: target.ch });
      cm.focus();
      cm.scrollIntoView({ line: target.line, ch: target.ch }, 120);
    });
    window.HTMLScriptLang.hint = hint;
    window.HTMLScriptLang.isReady = !!ts;
  }
  window.HTMLScriptLang = { init: init, isReady: false };
})();
