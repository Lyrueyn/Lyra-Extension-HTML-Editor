(function () {
  "use strict";
  const CORE = window.LyraLanguageCore;
  if (!CORE) return;

  function lineAt(text, index) {
    return (String(text || "").slice(0, Math.max(0, index)).match(/\n/g) || []).length + 1;
  }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function scriptsOf(source) {
    const out = [];
    const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(source))) {
      const attrs = m[1] || "";
      if (/\bsrc\s*=/i.test(attrs)) continue;
      const type = (attrs.match(/\btype\s*=\s*(?:"([^"]*)"|'([^']*)')/i) || []);
      const typeValue = String(type[1] || type[2] || "").toLowerCase();
      if (typeValue && !/javascript|module|ecmascript/.test(typeValue)) continue;
      const content = m[2] || "";
      if (!content.trim()) continue;
      const start = m.index + m[0].indexOf(">") + 1;
      let analysis = null;
      try { analysis = CORE.analyzeSource(content); } catch { analysis = null; }
      if (!analysis) continue;
      out.push({ content: content, startLine: lineAt(source, start), analysis: analysis, lineCount: content.split("\n").length });
    }
    return out;
  }

  function init(cm) {
    if (!cm || !CORE) return;
    const card = document.getElementById("scriptHoverCard");
    const param = document.getElementById("scriptParamHint");
    let blocks = [];
    let blocksSource = null;
    let hoverTimer = 0;
    let paramTimer = 0;

    function currentBlocks() {
      const source = cm.getValue();
      if (blocksSource !== source) { blocksSource = source; blocks = scriptsOf(source); }
      return blocks;
    }
    function wordAt(pos) {
      if (!pos || pos.line < 0 || pos.line >= cm.lineCount()) return null;
      const line = cm.getLine(pos.line);
      let start = pos.ch;
      while (start > 0 && /[\w$]/.test(line[start - 1])) start -= 1;
      let end = pos.ch;
      while (end < line.length && /[\w$]/.test(line[end])) end += 1;
      if (start === end) return null;
      const token = cm.getTokenAt({ line: pos.line, ch: start + 1 });
      if (/\b(comment|string)\b/.test(String(token.type || ""))) return null;
      return { name: line.slice(start, end), from: { line: pos.line, ch: start }, to: { line: pos.line, ch: end } };
    }
    function blockAtLine(line) {
      for (const block of currentBlocks()) {
        const relative = line - (block.startLine - 1);
        if (relative >= 0 && relative < block.lineCount) return { block: block, relative: relative };
      }
      return null;
    }
    function declarationLine(block, sym) {
      const lines = block.content.split("\n");
      const name = String(sym.name || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!name) return sym.line - 1;
      const patterns = sym.kind === "function" || sym.kind === "method" || sym.kind === "class"
        ? [new RegExp("\\b(?:async\\s+)?(?:function|class)\\s+" + name + "\\b")]
        : [new RegExp("\\b(?:const|let|var|function|class)\\s+" + name + "\\b")];
      for (const re of patterns) {
        for (let i = 0; i < lines.length; i += 1) if (re.test(lines[i])) return i;
      }
      return Math.max(0, sym.line - 1);
    }
    function symbolAt(pos) {
      const hit = blockAtLine(pos.line);
      const word = wordAt(pos);
      if (!hit || !word) return null;
      const candidates = hit.block.analysis.symbols.filter((s) => s.name === word.name);
      let symbol = candidates.find((s) => s.line - 1 === hit.relative) || candidates[0];
      if (!symbol && CORE.BUILTIN_GLOBALS && CORE.BUILTIN_GLOBALS[word.name]) {
        symbol = { name: word.name, kind: "builtin", line: hit.relative + 1, ch: word.from.ch, type: CORE.BUILTIN_GLOBALS[word.name], signature: word.name + ": " + CORE.BUILTIN_GLOBALS[word.name], doc: { description: "浏览器内置全局对象" } };
      }
      if (!symbol) return null;
      const declLine = declarationLine(hit.block, symbol);
      return { word: word, symbol: symbol, block: hit.block, declLine: declLine, absLine: (hit.block.startLine - 1) + declLine };
    }
    function hideHover() {
      clearTimeout(hoverTimer);
      if (card) card.hidden = true;
    }
    function showHover(event) {
      if (!card) return;
      clearTimeout(hoverTimer);
      let pos;
      try { pos = cm.coordsChar({ left: event.clientX, top: event.clientY }, "window"); } catch { return; }
      const found = symbolAt(pos);
      if (!found) { card.hidden = true; return; }
      const block = found.block;
      const sym = found.symbol;
      hoverTimer = setTimeout(() => {
        const doc = sym.doc || {};
        const label = sym.kind === "class" ? "CLASS" : sym.kind === "function" || sym.kind === "method" ? "FN" : "VAR";
        card.innerHTML = '<div class="source-hover-title"><span class="source-hover-kind">' + esc(label) + '</span><span class="source-hover-name">' + esc(sym.name) + '</span></div>' +
          '<div class="source-hover-sig">' + esc(sym.signature || sym.name) + '</div>' +
          (doc.description ? '<div class="source-hover-doc">' + esc(doc.description) + '</div>' : "") +
          '<div class="source-hover-meta">内联脚本 · Ln ' + (block.startLine + found.declLine) + '</div>';
        card.hidden = false;
        let left = event.clientX + 16;
        let top = event.clientY + 16;
        if (left + 420 > window.innerWidth) left = window.innerWidth - 432;
        if (top + 150 > window.innerHeight) top = Math.max(12, event.clientY - 150);
        card.style.left = Math.max(8, left) + "px";
        card.style.top = Math.max(8, top) + "px";
      }, 220);
    }
    function hideParam() { clearTimeout(paramTimer); if (param) param.hidden = true; }
    function updateParamHint() {
      clearTimeout(paramTimer);
      if (!param) return;
      paramTimer = setTimeout(() => {
        const pos = cm.getCursor();
        const hit = blockAtLine(pos.line);
        if (!hit) { param.hidden = true; return; }
        const lines = hit.block.content.split("\n");
        const before = lines.slice(0, hit.relative).join("\n") + (hit.relative > 0 ? "\n" : "") + lines[hit.relative].slice(0, pos.ch);
        let depth = 0;
        let open = -1;
        for (let i = before.length - 1; i >= 0; i -= 1) {
          if (before[i] === ")") depth += 1;
          else if (before[i] === "(") { if (depth === 0) { open = i; break; } depth -= 1; }
        }
        if (open < 0) { param.hidden = true; return; }
        const callee = (before.slice(0, open).match(/([A-Za-z_$][\w$]*)\s*$/) || [])[1];
        if (!callee) { param.hidden = true; return; }
        const sym = hit.block.analysis.symbols.find((s) => s.name === callee);
        if (!sym || !sym.params || !sym.params.length) { param.hidden = true; return; }
        let active = 0;
        let d = 0;
        for (const ch of before.slice(open + 1)) {
          if (ch === "(" || ch === "[" || ch === "{") d += 1;
          else if (ch === ")" || ch === "]" || ch === "}") d = Math.max(0, d - 1);
          else if (ch === "," && d === 0) active += 1;
        }
        const activeIndex = Math.min(active, sym.params.length - 1);
        const html = '<b>' + esc(sym.name) + '</b>(' + sym.params.map((p, i) => '<span class="' + (i === activeIndex ? "active" : "") + '">' + esc(p.name) + (p.optional ? "?" : "") + (p.type ? ": " + esc(p.type) : "") + '</span>').join(", ") + ')' + (sym.returns ? ": " + esc(sym.returns) : "");
        param.innerHTML = html;
        param.hidden = false;
        const cursor = cm.cursorCoords(null, "window");
        const wrap = cm.getWrapperElement().getBoundingClientRect();
        let left = cursor.left - wrap.left + 10;
        let top = cursor.bottom - wrap.top + 8;
        if (left + param.offsetWidth > wrap.width - 8) left = Math.max(8, wrap.width - param.offsetWidth - 8);
        if (top + param.offsetHeight > wrap.height - 8) top = Math.max(8, cursor.top - wrap.top - param.offsetHeight - 8);
        param.style.left = left + "px";
        param.style.top = top + "px";
      }, 80);
    }

    function hint() {
      const pos = cm.getCursor();
      const hit = blockAtLine(pos.line);
      if (!hit) return null;
      const word = wordAt(pos);
      const from = word ? word.from : pos;
      const prefix = word ? word.name : "";
      const names = [];
      const seen = new Set();
      for (const sym of hit.block.analysis.symbols) {
        if (!sym.name || seen.has(sym.name) || !sym.name.startsWith(prefix)) continue;
        seen.add(sym.name);
        const kind = sym.kind === "function" || sym.kind === "method" ? "fn" : sym.kind === "class" ? "class" : "var";
        names.push({ text: sym.name, displayText: sym.name, className: "lyra-script-hint-" + kind });
      }
      return { list: names, from: from, to: pos };
    }
    window.HTMLScriptLang.hint = hint;

    const wrap = cm.getWrapperElement();
    wrap.addEventListener("mousemove", (event) => showHover(event));
    wrap.addEventListener("mouseleave", hideHover);
    cm.on("scroll", hideHover);
    cm.on("change", () => { hideHover(); hideParam(); blocksSource = null; scheduleParam(); });
    cm.on("cursorActivity", () => { hideHover(); scheduleParam(); });
    function scheduleParam() { clearTimeout(paramTimer); updateParamHint(); }
    cm.on("mousedown", (editor, event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      let pos;
      try { pos = cm.coordsChar({ left: event.clientX, top: event.clientY }, "window"); } catch { return; }
      const found = symbolAt(pos);
      if (!found) return;
      event.preventDefault();
      cm.setCursor({ line: found.absLine, ch: found.symbol.ch || 0 });
      cm.focus();
      cm.scrollIntoView({ line: found.absLine, ch: found.symbol.ch || 0 }, 120);
    });
  }

  window.HTMLScriptLang = { init: init };

})();
