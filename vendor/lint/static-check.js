(function () {
  "use strict";

  function lineOf(text, index) {
    return (String(text || "").slice(0, Math.max(0, index)).match(/\n/g) || []).length + 1;
  }
  function blank(match) {
    return String(match || "").replace(/[^\n]/g, " ");
  }
  function problem(list, line, ch, severity, rule, message) {
    list.push({ line: Math.max(1, line || 1), ch: Math.max(0, ch || 0), severity: severity || "warning", rule: rule, message: message });
  }

  function analyze(source) {
    const text = String(source || "");
    const problems = [];
    const html = text
      .replace(/<!--[\s\S]*?-->/g, blank)
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, blank);

    const ids = new Map();
    const idRe = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
    let m;
    while ((m = idRe.exec(html))) {
      const value = (m[1] != null ? m[1] : m[2] != null ? m[2] : m[3] || "").trim();
      if (!value) continue;
      if (ids.has(value)) problem(problems, lineOf(html, m.index), 0, "warning", "duplicate-id", "重复的 id=\"" + value + "\"");
      else ids.set(value, true);
    }

    if (/<html\b/i.test(html) && !/<html\b[^>]*\blang\s*=/i.test(html)) problem(problems, 1, 0, "warning", "missing-lang", "<html> 缺少 lang 属性");

    const imgRe = /<img\b[^>]*>/gi;
    while ((m = imgRe.exec(html))) {
      if (!/\balt\s*=/i.test(m[0])) problem(problems, lineOf(html, m.index), 0, "warning", "img-alt", "<img> 缺少 alt 属性");
    }

    const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
    const optionalTags = new Set(["p", "li", "dt", "dd", "tr", "td", "th", "option", "thead", "tbody", "tfoot", "colgroup", "caption"]);
    const stack = [];
    const tagRe = /<\/?([a-zA-Z][\w:-]*)([^>]*)>/g;
    while ((m = tagRe.exec(html))) {
      const full = m[0];
      const name = m[1].toLowerCase();
      const line = lineOf(html, m.index);
      if (full.startsWith("</")) {
        if (optionalTags.has(name) || voidTags.has(name)) continue;
        let index = stack.length - 1;
        while (index >= 0 && stack[index].name !== name) index -= 1;
        if (index < 0) { problem(problems, line, 0, "error", "tag-mismatch", "没有对应开始标签的 </" + name + ">"); continue; }
        for (let i = stack.length - 1; i > index; i -= 1) problem(problems, stack[i].line, 0, "error", "tag-unclosed", "<" + stack[i].name + "> 没有闭合");
        stack.length = index;
        continue;
      }
      if (/\/\s*>$/.test(full) || voidTags.has(name) || optionalTags.has(name)) continue;
      stack.push({ name: name, line: line });
    }
    for (const item of stack) problem(problems, item.line, 0, "error", "tag-unclosed", "<" + item.name + "> 没有闭合");

    const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
    while ((m = styleRe.exec(text))) {
      const css = m[1];
      const start = m.index + m[0].indexOf(">") + 1;
      let depth = 0;
      let quote = "";
      let comment = false;
      let line = lineOf(text, start);
      for (let i = 0; i < css.length; i += 1) {
        const ch = css[i];
        if (ch === "\n") line += 1;
        if (comment) { if (ch === "*" && css[i + 1] === "/") { comment = false; i += 1; } continue; }
        if (quote) { if (ch === "\\") i += 1; else if (ch === quote) quote = ""; continue; }
        if (ch === "/" && css[i + 1] === "*") { comment = true; i += 1; continue; }
        if (ch === '"' || ch === "'") { quote = ch; continue; }
        if (ch === "{") depth += 1;
        else if (ch === "}") { depth -= 1; if (depth < 0) { problem(problems, line, 0, "error", "css-brace", "CSS 多了一个 }"); depth = 0; } }
      }
      if (depth > 0) problem(problems, lineOf(text, start), 0, "error", "css-brace", "CSS 缺少 " + depth + " 个 }");
      if (comment) problem(problems, lineOf(text, start), 0, "error", "css-comment", "CSS 注释没有闭合");
    }

    const keepRules = new Set(["syntax", "type-mismatch", "invalid-array-length", "invalid-json", "invalid-uri", "array-out-of-bounds", "possible-type-error", "call-non-function", "unconditional-recursion", "unhandled-promise", "possible-param-type-error"]);
    const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    while ((m = scriptRe.exec(text))) {
      const attrs = m[1] || "";
      const code = m[2] || "";
      if (!code.trim() || /\bsrc\s*=/i.test(attrs)) continue;
      const type = (attrs.match(/\btype\s*=\s*(?:"([^"]*)"|'([^']*)')/i) || []);
      const typeValue = String(type[1] || type[2] || "").toLowerCase();
      if (typeValue && !/javascript|module|ecmascript/.test(typeValue)) continue;
      if (!window.LyraJSTools) continue;
      let scriptProblems = [];
      try { scriptProblems = window.LyraJSTools.lintCode(code) || []; } catch (e) { scriptProblems = []; }
      const start = m.index + m[0].indexOf(">") + 1;
      const startLine = lineOf(text, start);
      for (const p of scriptProblems) {
        if (!keepRules.has(p.rule)) continue;
        problem(problems, startLine + (p.line || 1) - 1, p.ch || 0, p.severity || "warning", "script-" + p.rule, "内联脚本：" + p.message);
      }
    }

    problems.sort((a, b) => a.line - b.line || a.ch - b.ch);
    return problems;
  }

  window.HTMLStaticCheck = { analyze: analyze };
})();
