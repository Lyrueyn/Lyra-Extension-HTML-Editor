(() => {
  "use strict";

  const JS_EXT_RE = /\.(m?js|cjs|jsx|ts|tsx)$/i;
  const BUILTIN_SIGNATURES = {
    "console.log": { params: [{ name: "...data", type: "any" }], returns: "void" },
    "console.info": { params: [{ name: "...data", type: "any" }], returns: "void" },
    "console.warn": { params: [{ name: "...data", type: "any" }], returns: "void" },
    "console.error": { params: [{ name: "...data", type: "any" }], returns: "void" },
    "console.table": { params: [{ name: "data", type: "any" }, { name: "columns?", type: "string[]" }], returns: "void" },
    "document.querySelector": { params: [{ name: "selectors", type: "string" }], returns: "Element | null" },
    "document.querySelectorAll": { params: [{ name: "selectors", type: "string" }], returns: "NodeList" },
    "document.getElementById": { params: [{ name: "id", type: "string" }], returns: "HTMLElement | null" },
    "document.createElement": { params: [{ name: "tagName", type: "string" }], returns: "HTMLElement" },
    "document.addEventListener": { params: [{ name: "type", type: "string" }, { name: "listener", type: "function" }, { name: "options?", type: "object" }], returns: "void" },
    "JSON.parse": { params: [{ name: "text", type: "string" }], returns: "any" },
    "JSON.stringify": { params: [{ name: "value", type: "any" }, { name: "replacer?", type: "any" }, { name: "space?", type: "string | number" }], returns: "string" },
    "Math.max": { params: [{ name: "...values", type: "number" }], returns: "number" },
    "Math.min": { params: [{ name: "...values", type: "number" }], returns: "number" },
    "Math.round": { params: [{ name: "x", type: "number" }], returns: "number" },
    "Object.keys": { params: [{ name: "obj", type: "object" }], returns: "string[]" },
    "Object.values": { params: [{ name: "obj", type: "object" }], returns: "any[]" },
    "Array.isArray": { params: [{ name: "value", type: "any" }], returns: "boolean" },
    "Promise.resolve": { params: [{ name: "value", type: "any" }], returns: "Promise" },
    "localStorage.getItem": { params: [{ name: "key", type: "string" }], returns: "string | null" },
    "localStorage.setItem": { params: [{ name: "key", type: "string" }, { name: "value", type: "string" }], returns: "void" },
    "setTimeout": { params: [{ name: "handler", type: "function" }, { name: "timeout?", type: "number" }], returns: "number" },
    "fetch": { params: [{ name: "input", type: "string | Request" }, { name: "init?", type: "RequestInit" }], returns: "Promise<Response>" },
  };
  const BUILTIN_MEMBERS = {
    addEventListener: { params: [{ name: "type", type: "string" }, { name: "listener", type: "function" }, { name: "options?", type: "object" }], returns: "void" },
    removeEventListener: { params: [{ name: "type", type: "string" }, { name: "listener", type: "function" }], returns: "void" },
    dispatchEvent: { params: [{ name: "event", type: "Event" }], returns: "boolean" },
    querySelector: { params: [{ name: "selectors", type: "string" }], returns: "Element | null" },
    querySelectorAll: { params: [{ name: "selectors", type: "string" }], returns: "NodeList" },
    getElementById: { params: [{ name: "id", type: "string" }], returns: "HTMLElement | null" },
    getElementsByClassName: { params: [{ name: "names", type: "string" }], returns: "HTMLCollection" },
    getElementsByTagName: { params: [{ name: "tagName", type: "string" }], returns: "HTMLCollection" },
    createElement: { params: [{ name: "tagName", type: "string" }], returns: "HTMLElement" },
    createTextNode: { params: [{ name: "text", type: "string" }], returns: "Text" },
    appendChild: { params: [{ name: "node", type: "Node" }], returns: "Node" },
    append: { params: [{ name: "...nodes", type: "Node | string" }], returns: "void" },
    prepend: { params: [{ name: "...nodes", type: "Node | string" }], returns: "void" },
    removeChild: { params: [{ name: "node", type: "Node" }], returns: "Node" },
    insertBefore: { params: [{ name: "node", type: "Node" }, { name: "child", type: "Node | null" }], returns: "Node" },
    remove: { params: [], returns: "void" },
    setAttribute: { params: [{ name: "name", type: "string" }, { name: "value", type: "string" }], returns: "void" },
    getAttribute: { params: [{ name: "name", type: "string" }], returns: "string | null" },
    removeAttribute: { params: [{ name: "name", type: "string" }], returns: "void" },
    classList: { params: [], returns: "DOMTokenList" },
    closest: { params: [{ name: "selectors", type: "string" }], returns: "Element | null" },
    matches: { params: [{ name: "selectors", type: "string" }], returns: "boolean" },
    focus: { params: [], returns: "void" },
    blur: { params: [], returns: "void" },
    click: { params: [], returns: "void" },
    map: { params: [{ name: "callback", type: "function" }], returns: "array" },
    filter: { params: [{ name: "callback", type: "function" }], returns: "array" },
    forEach: { params: [{ name: "callback", type: "function" }], returns: "void" },
    reduce: { params: [{ name: "callback", type: "function" }, { name: "initial?", type: "any" }], returns: "any" },
    find: { params: [{ name: "callback", type: "function" }], returns: "any" },
    findIndex: { params: [{ name: "callback", type: "function" }], returns: "number" },
    some: { params: [{ name: "callback", type: "function" }], returns: "boolean" },
    every: { params: [{ name: "callback", type: "function" }], returns: "boolean" },
    includes: { params: [{ name: "value", type: "any" }], returns: "boolean" },
    indexOf: { params: [{ name: "value", type: "any" }], returns: "number" },
    lastIndexOf: { params: [{ name: "value", type: "any" }], returns: "number" },
    push: { params: [{ name: "...items", type: "any" }], returns: "number" },
    pop: { params: [], returns: "any" },
    shift: { params: [], returns: "any" },
    unshift: { params: [{ name: "...items", type: "any" }], returns: "number" },
    slice: { params: [{ name: "start?", type: "number" }, { name: "end?", type: "number" }], returns: "array | string" },
    splice: { params: [{ name: "start", type: "number" }, { name: "deleteCount?", type: "number" }, { name: "...items", type: "any" }], returns: "any[]" },
    join: { params: [{ name: "separator?", type: "string" }], returns: "string" },
    sort: { params: [{ name: "compare?", type: "function" }], returns: "array" },
    reverse: { params: [], returns: "array" },
    concat: { params: [{ name: "...items", type: "any" }], returns: "array" },
    flat: { params: [{ name: "depth?", type: "number" }], returns: "array" },
    flatMap: { params: [{ name: "callback", type: "function" }], returns: "array" },
    split: { params: [{ name: "separator", type: "string | RegExp" }], returns: "string[]" },
    replace: { params: [{ name: "pattern", type: "string | RegExp" }, { name: "replacement", type: "string | function" }], returns: "string" },
    replaceAll: { params: [{ name: "pattern", type: "string | RegExp" }, { name: "replacement", type: "string" }], returns: "string" },
    startsWith: { params: [{ name: "search", type: "string" }], returns: "boolean" },
    endsWith: { params: [{ name: "search", type: "string" }], returns: "boolean" },
    trim: { params: [], returns: "string" },
    toUpperCase: { params: [], returns: "string" },
    toLowerCase: { params: [], returns: "string" },
    padStart: { params: [{ name: "length", type: "number" }, { name: "fill?", type: "string" }], returns: "string" },
    padEnd: { params: [{ name: "length", type: "number" }, { name: "fill?", type: "string" }], returns: "string" },
    substring: { params: [{ name: "start", type: "number" }, { name: "end?", type: "number" }], returns: "string" },
    then: { params: [{ name: "onFulfilled", type: "function" }, { name: "onRejected?", type: "function" }], returns: "Promise" },
    catch: { params: [{ name: "onRejected", type: "function" }], returns: "Promise" },
    finally: { params: [{ name: "onFinally", type: "function" }], returns: "Promise" },
    getItem: { params: [{ name: "key", type: "string" }], returns: "string | null" },
    setItem: { params: [{ name: "key", type: "string" }, { name: "value", type: "string" }], returns: "void" },
    removeItem: { params: [{ name: "key", type: "string" }], returns: "void" },
    clear: { params: [], returns: "void" },
    log: { params: [{ name: "...data", type: "any" }], returns: "void" },
    warn: { params: [{ name: "...data", type: "any" }], returns: "void" },
    error: { params: [{ name: "...data", type: "any" }], returns: "void" },
    info: { params: [{ name: "...data", type: "any" }], returns: "void" },
    debug: { params: [{ name: "...data", type: "any" }], returns: "void" },
    parse: { params: [{ name: "text", type: "string" }], returns: "any" },
    stringify: { params: [{ name: "value", type: "any" }, { name: "replacer?", type: "any" }, { name: "space?", type: "string | number" }], returns: "string" },
    max: { params: [{ name: "...values", type: "number" }], returns: "number" },
    min: { params: [{ name: "...values", type: "number" }], returns: "number" },
    round: { params: [{ name: "x", type: "number" }], returns: "number" },
    floor: { params: [{ name: "x", type: "number" }], returns: "number" },
    ceil: { params: [{ name: "x", type: "number" }], returns: "number" },
    random: { params: [], returns: "number" },
    keys: { params: [{ name: "obj", type: "object" }], returns: "string[]" },
    values: { params: [{ name: "obj", type: "object" }], returns: "any[]" },
    entries: { params: [{ name: "obj", type: "object" }], returns: "Iterable" },
    assign: { params: [{ name: "target", type: "object" }, { name: "...sources", type: "object" }], returns: "object" },
    freeze: { params: [{ name: "obj", type: "object" }], returns: "object" },
  };
  const BUILTIN_PROPERTIES = {
    readyState: "string", visibilityState: "string", hidden: "boolean", title: "string", body: "HTMLElement", head: "HTMLElement", documentElement: "HTMLElement", cookie: "string", URL: "string", location: "Location", activeElement: "Element | null", characterSet: "string", contentType: "string", referrer: "string", domain: "string", lastModified: "string",
    innerWidth: "number", innerHeight: "number", outerWidth: "number", outerHeight: "number", scrollX: "number", scrollY: "number", pageXOffset: "number", pageYOffset: "number", devicePixelRatio: "number", name: "string", closed: "boolean", opener: "Window | null", parent: "Window", top: "Window", self: "Window", localStorage: "Storage", sessionStorage: "Storage", console: "Console", navigator: "Navigator", history: "History",
    length: "number", textContent: "string", innerHTML: "string", innerText: "string", outerHTML: "string", value: "string", checked: "boolean", disabled: "boolean", selected: "boolean", multiple: "boolean", className: "string", id: "string", tagName: "string", nodeName: "string", nodeType: "number", childNodes: "NodeList", children: "HTMLCollection", firstChild: "Node | null", lastChild: "Node | null", nextSibling: "Node | null", previousSibling: "Node | null", parentNode: "Node | null", parentElement: "Element | null", classList: "DOMTokenList", style: "CSSStyleDeclaration", dataset: "DOMStringMap", ownerDocument: "Document", offsetWidth: "number", offsetHeight: "number", clientWidth: "number", clientHeight: "number", scrollWidth: "number", scrollHeight: "number", scrollTop: "number", scrollLeft: "number", src: "string", href: "string", target: "string", rel: "string", type: "string", width: "number", height: "number", x: "number", y: "number", left: "number", top: "number", right: "number", bottom: "number", complete: "boolean", naturalWidth: "number", naturalHeight: "number", currentTime: "number", duration: "number", paused: "boolean", volume: "number", muted: "boolean",
  };
  const JS_RESERVED = new Set(["break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do", "else", "export", "extends", "finally", "for", "function", "if", "import", "in", "instanceof", "let", "new", "return", "super", "switch", "this", "throw", "try", "typeof", "var", "void", "while", "with", "yield", "async", "await", "of", "from", "as", "get", "set", "static", "true", "false", "null", "undefined"]);
  const BUILTIN_GLOBALS = { console: "Console", document: "Document", window: "Window", globalThis: "globalThis", Math: "Math", JSON: "JSON", Object: "ObjectConstructor", Array: "ArrayConstructor", String: "StringConstructor", Number: "NumberConstructor", Boolean: "BooleanConstructor", Date: "DateConstructor", RegExp: "RegExpConstructor", Promise: "PromiseConstructor", Map: "MapConstructor", Set: "SetConstructor", Error: "ErrorConstructor", localStorage: "Storage", sessionStorage: "Storage", location: "Location", navigator: "Navigator", history: "History", fetch: "function", setTimeout: "function", setInterval: "function" };
  const KIND_LABEL = { function: "FN", method: "FN", class: "CLASS", variable: "VAR", property: "PROP", interface: "TYPE", type: "TYPE", constructor: "FN", import: "IMP" };

  function escHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function dirname(rel) {
    const s = String(rel || "");
    const i = s.lastIndexOf("/");
    return i >= 0 ? s.slice(0, i) : "";
  }
  function basename(rel) {
    const s = String(rel || "");
    const i = s.lastIndexOf("/");
    return i >= 0 ? s.slice(i + 1) : s;
  }
  function normalizePath(path) {
    const parts = String(path || "").split("/");
    const out = [];
    for (const part of parts) {
      if (!part || part === ".") continue;
      if (part === "..") out.pop();
      else out.push(part);
    }
    return out.join("/");
  }
  function lineStarts(text) {
    const starts = [0];
    for (let i = 0; i < text.length; i += 1) if (text[i] === "\n") starts.push(i + 1);
    return starts;
  }
  function posToOffset(starts, line, ch) { return (starts[line] || 0) + ch; }

  function splitParams(raw) {
    const out = [];
    let depth = 0;
    let quote = "";
    let start = 0;
    const text = String(raw || "");
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (quote) {
        if (ch === "\\") i += 1;
        else if (ch === quote) quote = "";
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
      if (ch === "(" || ch === "[" || ch === "{" || ch === "<") depth += 1;
      else if (ch === ")" || ch === "]" || ch === "}" || ch === ">") depth = Math.max(0, depth - 1);
      else if (ch === "," && depth === 0) { out.push(text.slice(start, i)); start = i + 1; }
    }
    out.push(text.slice(start));
    return out.map((x) => x.trim()).filter(Boolean);
  }

  function splitTopLevelExpr(value, op) {
    const parts = [];
    let depth = 0;
    let quote = "";
    let start = 0;
    const text = String(value || "");
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      if (quote) {
        if (ch === "\\") i += 1;
        else if (ch === quote) quote = "";
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
      if (ch === "(" || ch === "[" || ch === "{") depth += 1;
      else if (ch === ")" || ch === "]" || ch === "}") depth = Math.max(0, depth - 1);
      else if (depth === 0 && text.startsWith(op, i)) {
        parts.push(text.slice(start, i).trim());
        start = i + op.length;
        i += op.length - 1;
      }
    }
    parts.push(text.slice(start).trim());
    return parts;
  }
  function uniqueTypes(types) {
    const out = [];
    for (const t of types) {
      const v = String(t || "").trim();
      if (v && !out.includes(v)) out.push(v);
    }
    return out.length === 1 ? out[0] : out.join(" | ");
  }
  function inferType(expr) {
    let value = String(expr || "").trim().replace(/;\s*$/, "");
    if (!value) return "";
    while (/^\(.*\)$/.test(value)) value = value.slice(1, -1).trim();
    if (/^["']/.test(value)) return "string";
    if (/^`/.test(value)) return "string";
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value)) return "number";
    if (/^(true|false)$/.test(value)) return "boolean";
    if (/^null$/.test(value)) return "null";
    if (/^undefined$/.test(value)) return "undefined";
    if (/^NaN$/.test(value)) return "number";
    if (/^Infinity$/.test(value)) return "number";
    if (/^\[/.test(value)) {
      const close = value.lastIndexOf("]");
      const inner = close > 0 ? value.slice(1, close) : "";
      const items = splitParams(inner);
      const types = items.map(inferType).filter(Boolean);
      if (!types.length) return "any[]";
      const uniq = uniqueTypes(types);
      return (types.length > 1 && uniq.includes(" | ") ? "(" + uniq + ")" : uniq) + "[]";
    }
    if (/^\{/.test(value)) return "object";
    if (/^\//.test(value)) return "RegExp";
    if (/^(async\s*)?(\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/.test(value)) return "function";
    if (/^(async\s+)?function\b/.test(value)) return "function";
    if (/^typeof\b/.test(value)) return "string";
    if (/^!+\s*/.test(value)) return "boolean";
    if (/\s*===\s*|\s*!==\s*|\s*==\s*|\s*!=\s*|\s*<=\s*|\s*>=\s*|\s*<\s*|\s*>\s*|\binstanceof\b|\bin\b/.test(value)) return "boolean";
    if (/^Array\.isArray\s*\(/.test(value)) return "boolean";
    if (/^Number\.isFinite\s*\(|^isFinite\s*\(|^isNaN\s*\(/.test(value)) return "boolean";
    if (/^Boolean\s*\(/.test(value)) return "boolean";
    const ternary = splitTopLevelExpr(value, "?");
    if (ternary.length === 2) {
      const tail = splitTopLevelExpr(ternary[1], ":");
      if (tail.length === 2) return uniqueTypes([inferType(tail[0]), inferType(tail[1])].filter(Boolean)) || "any";
    }
    for (const op of ["??", "||", "&&"]) {
      const parts = splitTopLevelExpr(value, op);
      if (parts.length > 1) {
        const rawTypes = parts.map(inferType);
        const types = rawTypes.filter(Boolean);
        if (types.length) {
          if (rawTypes.some((t) => !t) && types.includes("null")) return "any | null";
          return uniqueTypes(types);
        }
      }
    }
    const plus = splitTopLevelExpr(value, "+");
    if (plus.length > 1) {
      const types = plus.map(inferType);
      if (types.some((typ) => typ === "string")) return "string";
      if (types.every((typ) => typ === "number")) return "number";
      return "number | string";
    }
    if (/^[^=><]+[+\-*/%]\s*[^=]/.test(value) && !/^\s*[-+]\s*[A-Za-z_$]/.test(value)) return "number";
    const nw = value.match(/^new\s+([A-Za-z_$][\w$]*)/);
    if (nw) return nw[1];
    const call = value.match(/^(?:await\s+)?([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/);
    if (call) {
      const callee = call[1];
      if (BUILTIN_SIGNATURES[callee] && BUILTIN_SIGNATURES[callee].returns) return BUILTIN_SIGNATURES[callee].returns;
      if (callee === "Number" || callee === "parseInt" || callee === "parseFloat") return "number";
      if (callee === "String" || callee === "JSON.stringify" || callee === "prompt") return "string";
      if (callee === "Boolean") return "boolean";
      if (callee === "Array" || callee === "Object.keys" || callee === "Object.values" || callee === "Object.entries") return "array";
      if (callee === "Object") return "object";
      if (callee === "Date.now") return "number";
      if (callee === "Date") return "Date";
      if (callee === "Promise" || callee === "Promise.resolve" || callee === "fetch") return "Promise";
      const last = callee.split(".").pop();
      if (["map", "filter", "slice", "concat", "flat", "flatMap", "sort", "reverse", "keys", "values", "entries"].includes(last)) return "array";
      if (["join", "toString", "toUpperCase", "toLowerCase", "trim", "replace", "replaceAll", "padStart", "padEnd"].includes(last)) return "string";
      if (["getItem", "querySelector", "getElementById", "getAttribute"].includes(last)) return "string | null";
      if (["querySelectorAll", "getElementsByClassName", "getElementsByTagName"].includes(last)) return "NodeList";
      if (["createElement", "appendChild", "insertBefore", "closest"].includes(last)) return "HTMLElement";
      if (["addEventListener", "removeEventListener", "append", "prepend", "remove", "setAttribute"].includes(last)) return "void";
      if (["then", "catch", "finally"].includes(last)) return "Promise";
      if (last === "map" || last === "filter") return "array";
    }
    const member = value.match(/^([A-Za-z_$][\w$]*)\s*\.\s*([A-Za-z_$][\w$]*)$/);
    if (member) {
      if (BUILTIN_PROPERTIES[member[2]]) return BUILTIN_PROPERTIES[member[2]];
      if (member[2] === "length") return "number";
    }
    if (/^(document|window|navigator|location)\./.test(value)) {
      const prop = value.split(".").pop();
      if (BUILTIN_PROPERTIES[prop]) return BUILTIN_PROPERTIES[prop];
    }
    return "";
  }

  function parseJsDoc(raw) {
    const text = String(raw || "").replace(/^\s*\/\*\*?/, "").replace(/\*\/\s*$/, "");
    const lines = text.split("\n").map((l) => l.replace(/^\s*\*?\s?/, "").trim());
    const params = [];
    const returnsParts = [];
    const desc = [];
    for (const line of lines) {
      let m = line.match(/^@param\s+(?:\{([^}]*)\}\s*)?(\[?[\w$.]+\]?)\s*(?:-\s*)?(.*)$/);
      if (m) {
        const rawName = m[2].replace(/[\[\]]/g, "");
        params.push({ name: rawName, type: (m[1] || "").trim(), description: m[3] || "", optional: /\[/.test(m[2]) });
        continue;
      }
      m = line.match(/^@returns?\s+(?:\{([^}]*)\})?\s*(.*)$/);
      if (m) { returnsParts.push({ type: (m[1] || "").trim(), description: m[2] || "" }); continue; }
      m = line.match(/^@type\s+(?:\{([^}]*)\})?\s*(.*)$/);
      if (m) { desc.push("@type " + (m[1] || m[2] || "")); continue; }
      if (/^@\w+/.test(line)) continue;
      if (line) desc.push(line);
    }
    return {
      description: desc.join("\n").trim(),
      params: params,
      returns: returnsParts[0] || null,
    };
  }

  function parseParams(raw, jsdoc) {
    return splitParams(raw).map((part) => {
      let text = part.replace(/\/\/.*$/, "").trim();
      let rest = false;
      if (text.startsWith("...")) { rest = true; text = text.slice(3).trim(); }
      const m = text.match(/^([A-Za-z_$][\w$]*)\s*(\?)?\s*(?::\s*([^=]+?))?\s*(?:=\s*(.+))?$/);
      let name = m ? m[1] : text.split(/[:=]/)[0].trim();
      let type = m && m[3] ? m[3].trim() : "";
      let optional = !!(m && m[2]);
      const dflt = m && m[4] ? m[4].trim() : "";
      if (!type && dflt) type = inferType(dflt);
      const doc = (jsdoc && jsdoc.params || []).find((p) => p.name === name || p.name.replace(/^\.\.\./, "") === name);
      if (!type && doc) type = doc.type;
      if (!optional) optional = !!(doc && doc.optional);
      if (dflt) optional = true;
      if (rest) name = "..." + name;
      return { name: name || "param", type: type || "any", optional: optional, default: dflt, description: (doc && doc.description) || "" };
    });
  }

  function collectBindingNames(pattern, out) {
    const text = String(pattern || "").trim();
    if (!text) return out;
    if (text.startsWith("{")) {
      const inner = text.slice(1, text.lastIndexOf("}"));
      for (const item of splitParams(inner)) {
        const part = item.trim();
        if (!part || part.startsWith("...")) continue;
        const colon = part.indexOf(":");
        const value = colon >= 0 ? part.slice(colon + 1).trim() : part;
        collectBindingNames(value, out);
      }
    } else if (text.startsWith("[")) {
      const inner = text.slice(1, text.lastIndexOf("]"));
      for (const item of splitParams(inner)) collectBindingNames(item, out);
    } else {
      const m = text.match(/^([A-Za-z_$][\w$]*)/);
      if (m) out.push(m[1]);
    }
    return out;
  }

  function inferReturnType(lines, startLine) {
    const types = [];
    let depth = 0;
    let started = false;
    for (let i = startLine; i < lines.length; i += 1) {
      const line = lines[i];
      for (const ch of line) {
        if (ch === "{") { depth += 1; started = true; }
        else if (ch === "}") depth -= 1;
      }
      const m = line.match(/^\s*return\s+(.+?);?\s*$/);
      if (m) {
        const typ = inferType(m[1]);
        if (typ) types.push(typ);
      }
      if (started && i > startLine && depth <= 0) break;
    }
    return uniqueTypes(types);
  }

  function signatureFor(sym) {
    if (sym.kind === "class") return "class " + sym.name + (sym.extends ? " extends " + sym.extends : "");
    if (sym.kind === "variable") return (sym.declKind || "const") + " " + sym.name + (sym.type && sym.type !== "function" ? ": " + sym.type : "");
    const params = (sym.params || []).map((p) => p.name + (p.optional ? "?" : "") + (p.type ? ": " + p.type : "")).join(", ");
    return sym.name + "(" + params + ")" + (sym.returns ? ": " + sym.returns : "");
  }

  function analyzeSource(text) {
    const lines = String(text || "").split("\n");
    const starts = lineStarts(text);
    const symbols = [];
    const imports = {};
    const exportsList = [];
    const clauses = [];
    let defaultExportName = "";

    function docAt(lineIndex) {
      let i = lineIndex - 1;
      while (i >= 0 && !lines[i].trim()) i -= 1;
      if (i < 0 || !/\*\/\s*$/.test(lines[i])) return null;
      let start = i;
      while (start >= 0 && !/\/\*\*/.test(lines[start])) start -= 1;
      if (start < 0) return null;
      return parseJsDoc(lines.slice(start, i + 1).join("\n"));
    }

    function addSymbol(sym) {
      sym.line = sym.line || 0;
      sym.ch = sym.ch || 0;
      sym.signature = sym.signature || signatureFor(sym);
      symbols.push(sym);
      return sym;
    }

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      if (!line.trim()) continue;
      let m;

      m = line.match(/^\s*import\s+(?:(?:type\s+)?([A-Za-z_$][\w$]*)\s*,?\s*)?(?:\{([^}]*)\}\s*)?(?:\*\s+as\s+([A-Za-z_$][\w$]*)\s*)?from\s+["']([^"']+)["']/);
      if (m) {
        const source = m[4];
        if (m[1]) imports[m[1]] = { source: source, imported: "default", default: true };
        if (m[3]) imports[m[3]] = { source: source, imported: "*", namespace: true };
        if (m[2]) {
          for (const item of m[2].split(",")) {
            const pair = item.trim().split(/\s+as\s+/);
            if (!pair[0]) continue;
            const local = (pair[1] || pair[0]).trim();
            imports[local] = { source: source, imported: pair[0].trim(), default: false };
          }
        }
        continue;
      }

      let exported = false;
      let defaultExport = false;
      let body = line;
      const exp = line.match(/^\s*export\s+(default\s+)?/);
      if (exp) {
        exported = true;
        defaultExport = !!exp[1];
        body = line.slice(exp[0].length);
      }

      const clause = body.match(/^\s*\{([^}]*)\}\s*(?:from\s+["']([^"']+)["'])?\s*;?\s*$/);
      if (clause) {
        for (const item of clause[1].split(",")) {
          const pair = item.trim().split(/\s+as\s+/);
          if (pair[0]) clauses.push({ local: pair[0].trim(), exported: (pair[1] || pair[0]).trim(), source: clause[2] || "" });
        }
        continue;
      }
      if (defaultExport) {
        const dm = body.match(/^\s*([A-Za-z_$][\w$]*)\s*;?\s*$/);
        if (dm) defaultExportName = dm[1];
      }

      m = body.match(/^\s*(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\(([^)]*)\)\s*(?::\s*([^{]+?))?\s*(?:\{|$)/);
      if (m) {
        const doc = docAt(lineIndex);
        const name = m[1];
        const params = parseParams(m[2], doc);
        let returns = (m[3] || (doc && doc.returns && doc.returns.type) || "").trim();
        if (!returns) returns = inferReturnType(lines, lineIndex);
        addSymbol({ name, kind: "function", line: lineIndex, ch: line.indexOf(name), params, returns, type: "function", doc, exported, defaultExport, signature: "function " + name + "(" + params.map((p) => p.name + (p.optional ? "?" : "") + (p.type ? ": " + p.type : "")).join(", ") + ")" + (returns ? ": " + returns : "") });
        for (const param of params) {
          const pn = param.name.replace(/^\.\.\./, "");
          if (pn) addSymbol({ name: pn, kind: "variable", line: lineIndex, ch: line.indexOf(name), type: param.type, doc: { description: param.description || "", params: [], returns: null }, local: true, parent: name, exported: false, defaultExport: false, signature: pn + ": " + param.type });
        }
        continue;
      }

      m = body.match(/^\s*class\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([^{]+))?/);
      if (m) {
        const doc = docAt(lineIndex);
        const className = m[1];
        addSymbol({ name: className, kind: "class", line: lineIndex, ch: line.indexOf(className), extends: (m[2] || "").trim(), type: "class", doc, exported, defaultExport, signature: "class " + className + (m[2] ? " extends " + m[2].trim() : "") });
        let depth = 0;
        let end = lineIndex;
        for (let j = lineIndex; j < lines.length; j += 1) {
          for (const ch of lines[j]) { if (ch === "{") depth += 1; else if (ch === "}") depth -= 1; }
          end = j;
          if (j > lineIndex && depth <= 0) break;
        }
        for (let j = lineIndex + 1; j < end; j += 1) {
          const field = lines[j].match(/^\s+(?:static\s+)?([A-Za-z_$][\w$]*)\s*=\s*(.*?)\s*;?\s*$/);
          if (field && !/^(if|for|while|switch|return|throw|const|let|var|function)$/.test(field[1])) {
            const ftype = inferType(field[2]) || "any";
            addSymbol({ name: field[1], kind: "property", line: j, ch: lines[j].indexOf(field[1]), type: ftype, doc: docAt(j), parent: className, exported: false, defaultExport: false, signature: field[1] + ": " + ftype });
            continue;
          }
          const mm = lines[j].match(/^\s+(?:(?:async|static|get|set)\s+)*([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*(?::\s*([^{]+?))?\s*\{/);
          if (!mm) continue;
          const md = docAt(j);
          const params = parseParams(mm[2], md);
          let returns = (mm[3] || (md && md.returns && md.returns.type) || "").trim();
          if (!returns) returns = inferReturnType(lines, j);
          addSymbol({ name: mm[1], kind: "method", line: j, ch: lines[j].indexOf(mm[1]), params, returns, type: "method", doc: md, parent: className, exported: false, defaultExport: false });
          for (const param of params) {
            const pn = param.name.replace(/^\.\.\./, "");
            if (pn) addSymbol({ name: pn, kind: "variable", line: j, ch: lines[j].indexOf(mm[1]), type: param.type, doc: { description: param.description || "", params: [], returns: null }, local: true, parent: mm[1], exported: false, defaultExport: false, signature: pn + ": " + param.type });
          }
        }
        continue;
      }

      m = body.match(/^\s*(?:interface|type)\s+([A-Za-z_$][\w$]*)/);
      if (m) {
        addSymbol({ name: m[1], kind: "type", line: lineIndex, ch: line.indexOf(m[1]), type: "type", doc: docAt(lineIndex), exported, defaultExport, signature: body.trim() });
        continue;
      }

      m = body.match(/^\s*(const|let|var)\s+([\s\S]+?)\s*;?\s*$/);
      if (m) {
        const declKind = m[1];
        const rest = m[2].trim();
        const doc = docAt(lineIndex);
        let searchFrom = 0;
        for (const rawPart of splitParams(rest)) {
          const part = rawPart.trim().replace(/;\s*$/, "");
          if (!part) continue;
          if (part.startsWith("{") || part.startsWith("[")) {
            const open = part[0];
            const close = open === "{" ? "}" : "]";
            const endIdx = part.lastIndexOf(close);
            if (endIdx > 0) {
              const names = collectBindingNames(part.slice(0, endIdx + 1), []);
              const rhs = part.slice(endIdx + 1).replace(/^\s*=\s*/, "").trim();
              const bindType = rhs ? (inferType(rhs) || (open === "{" ? "object" : "array")) : (open === "{" ? "object" : "array");
              for (const name of names) {
                const ch = line.indexOf(name, searchFrom);
                searchFrom = Math.max(0, ch + name.length);
                addSymbol({ name, kind: "variable", line: lineIndex, ch: Math.max(0, ch), type: bindType, doc, local: true, exported, defaultExport, declKind, signature: declKind + " " + name + ": " + bindType });
              }
            }
            continue;
          }
          const dm = part.match(/^([A-Za-z_$][\w$]*)\s*(?::\s*([^=]+?))?\s*(?:=\s*([\s\S]*))?$/);
          if (!dm) continue;
          const name = dm[1];
          const annotation = (dm[2] || "").trim();
          const rhs = (dm[3] || "").trim();
          const ch = Math.max(0, line.indexOf(name, searchFrom));
          searchFrom = ch + name.length;
          const arrow = rhs.match(/^(?:async\s*)?(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*=>/);
          const fn = rhs.match(/^(?:async\s+)?function\s*\*?\s*\w*\s*\(([^)]*)\)\s*(?::\s*([^{]+?))?\s*\{/);
          if (arrow || fn) {
            const params = parseParams(arrow ? (arrow[1] || arrow[2] || "") : fn[1], doc);
            let returns = ((arrow ? "" : fn[2]) || (doc && doc.returns && doc.returns.type) || annotation).trim();
            if (!returns && arrow) {
              const bodyExpr = rhs.slice(rhs.indexOf("=>") + 2).trim();
              if (!bodyExpr.startsWith("{")) returns = inferType(bodyExpr);
            }
            if (!returns) returns = inferReturnType(lines, lineIndex);
            addSymbol({ name, kind: "function", line: lineIndex, ch, params, returns, type: annotation || "function", doc, exported, defaultExport, declKind, signature: name + "(" + params.map((p) => p.name + (p.optional ? "?" : "") + (p.type ? ": " + p.type : "")).join(", ") + ")" + (returns ? ": " + returns : "") });
            for (const param of params) {
              const pn = param.name.replace(/^\.\.\./, "");
              if (pn) addSymbol({ name: pn, kind: "variable", line: lineIndex, ch, type: param.type, doc: { description: param.description || "", params: [], returns: null }, local: true, parent: name, exported: false, defaultExport: false, signature: pn + ": " + param.type });
            }
          } else {
            const typ = annotation || inferType(rhs) || "any";
            addSymbol({ name, kind: "variable", line: lineIndex, ch, type: typ, doc, exported, defaultExport, declKind, signature: declKind + " " + name + ": " + typ });
            if (rhs.startsWith("{")) {
              let depth = 0;
              let objEnd = lineIndex;
              for (let j = lineIndex; j < lines.length; j += 1) {
                for (const c of lines[j]) { if (c === "{") depth += 1; else if (c === "}") depth -= 1; }
                objEnd = j;
                if (j > lineIndex && depth <= 0) break;
              }
              for (let j = lineIndex + 1; j < objEnd; j += 1) {
                const prop = lines[j].match(/^\s+([A-Za-z_$][\w$]*)\s*:\s*(.+?)\s*,?\s*$/);
                if (prop) {
                  const ptype = inferType(prop[2]) || "any";
                  addSymbol({ name: prop[1], kind: "property", line: j, ch: lines[j].indexOf(prop[1]), type: ptype, doc: null, parent: name, exported: false, defaultExport: false, signature: prop[1] + ": " + ptype });
                  continue;
                }
                const mm = lines[j].match(/^\s+(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/);
                if (mm) {
                  const params = parseParams(mm[2], null);
                  addSymbol({ name: mm[1], kind: "method", line: j, ch: lines[j].indexOf(mm[1]), params, returns: "", type: "method", doc: null, parent: name, exported: false, defaultExport: false });
                }
              }
            }
          }
        }
        continue;
      }
    }

    for (const sym of symbols) {
      if (sym.exported && sym.name) exportsList.push({ name: sym.name, isDefault: !!sym.defaultExport, symbol: sym });
    }
    for (const clause of clauses) {
      const local = symbols.find((s) => s.name === clause.local);
      exportsList.push({ name: clause.exported, isDefault: false, symbol: local || null, source: clause.source, localName: clause.local });
    }
    if (defaultExportName) {
      const sym = symbols.find((s) => s.name === defaultExportName);
      if (sym && !exportsList.some((e) => e.isDefault)) exportsList.push({ name: sym.name, isDefault: true, symbol: sym });
    }
    return { text: String(text || ""), lines, starts, symbols, imports, exports: exportsList };
  }

  function create(ctx) {
    const getCm = ctx.getCm;
    const getState = ctx.getState;
    const hostCall = ctx.hostCall;
    let currentCache = null;
    let projectIndex = new Map();
    let projectLoaded = false;
    let projectPromise = null;
    let hoverTimer = 0;
    let paramTimer = 0;
    let dialogResolve = null;
    let importCandidates = [];
    let importActive = 0;

    function cm() { return getCm(); }
    function st() { return getState(); }
    function currentAnalysis() {
      const editor = cm();
      const text = editor ? editor.getValue() : "";
      if (currentCache && currentCache.text === text) return currentCache.data;
      currentCache = { text, data: analyzeSource(text) };
      return currentCache.data;
    }
    function wordAtCursor() {
      const editor = cm();
      if (!editor) return null;
      const pos = editor.getCursor();
      const line = editor.getLine(pos.line);
      let start = pos.ch;
      while (start > 0 && /[\w$]/.test(line[start - 1])) start -= 1;
      let end = pos.ch;
      while (end < line.length && /[\w$]/.test(line[end])) end += 1;
      if (start === end) return null;
      const name = line.slice(start, end);
      return { name, from: { line: pos.line, ch: start }, to: { line: pos.line, ch: end } };
    }
    function wordAtPos(editor, pos) {
      if (!editor || !pos || pos.line < 0 || pos.line >= editor.lineCount()) return null;
      const line = editor.getLine(pos.line);
      if (line == null) return null;
      let start = pos.ch;
      while (start > 0 && /[\w$]/.test(line[start - 1])) start -= 1;
      let end = pos.ch;
      while (end < line.length && /[\w$]/.test(line[end])) end += 1;
      return start === end ? null : { name: line.slice(start, end), from: { line: pos.line, ch: start }, to: { line: pos.line, ch: end } };
    }
    function skipToken(pos) {
      const editor = cm();
      if (!editor || !pos || pos.line < 0 || pos.line >= editor.lineCount()) return true;
      const t = editor.getTokenAt(pos);
      return /\b(comment|string)\b/.test(String(t.type || ""));
    }
    function resolveRelative(fromRel, source) {
      if (!source || !source.startsWith(".")) return null;
      let base = normalizePath(dirname(fromRel) + "/" + source);
      const files = new Set((st().files || []).map((f) => f.rel));
      const candidates = [base, base + ".js", base + ".mjs", base + ".cjs", base + ".jsx", base + ".ts", base + ".tsx", base + "/index.js", base + "/index.ts"];
      return candidates.find((c) => files.has(c)) || null;
    }
    async function ensureProjectIndex(force) {
      if (force) { projectLoaded = false; projectIndex = new Map(); }
      if (projectLoaded) { projectIndex.set(st().currentRel, currentAnalysis()); return projectIndex; }
      if (projectPromise) return projectPromise;
      projectPromise = (async () => {
        const map = new Map();
        const files = (st().files || []).filter((f) => JS_EXT_RE.test(f.rel || ""));
        try { ctx.setStatus("正在索引项目…"); } catch { }
        for (const file of files) {
          if (file.rel === st().currentRel) { map.set(file.rel, currentAnalysis()); continue; }
          try {
            const res = await hostCall("host.workspace.load", { path: file.rel });
            if (res && res.ok && res.data != null) map.set(file.rel, analyzeSource(ctx.decodeText(res.data)));
          } catch { }
        }
        projectIndex = map;
        projectLoaded = true;
        try { ctx.setStatus("索引完成（" + map.size + " 个文件）"); } catch { }
        return map;
      })();
      try { return await projectPromise; } finally { projectPromise = null; }
    }
    function invalidateProjectIndex() { projectLoaded = false; projectIndex = new Map(); }
    function findLocal(name) { return currentAnalysis().symbols.find((s) => s.name === name); }
    async function resolveSymbol(name) {
      const local = findLocal(name);
      if (local) return { symbol: local, rel: st().currentRel };
      const imp = currentAnalysis().imports[name];
      if (imp) {
        const targetRel = resolveRelative(st().currentRel, imp.source);
        if (targetRel) {
          const idx = await ensureProjectIndex();
          const analysis = targetRel === st().currentRel ? currentAnalysis() : idx.get(targetRel);
          if (analysis) {
            const sym = imp.default
              ? (analysis.exports.find((e) => e.isDefault) || {}).symbol || analysis.symbols.find((s) => s.kind === "function" || s.kind === "class")
              : analysis.symbols.find((s) => s.name === imp.imported);
            if (sym) return { symbol: sym, rel: targetRel };
          }
        }
      }
      const idx = await ensureProjectIndex();
      for (const [rel, analysis] of idx) {
        const sym = analysis.symbols.find((s) => s.name === name);
        if (sym) return { symbol: sym, rel };
      }
      return null;
    }
    async function openLocation(rel, line, ch) {
      if (rel && rel !== st().currentRel) await ctx.switchFile(rel);
      const editor = cm();
      if (!editor) return;
      editor.setCursor({ line: Math.max(0, line || 0), ch: Math.max(0, ch || 0) });
      editor.focus();
      editor.scrollIntoView({ line: Math.max(0, line || 0), ch: Math.max(0, ch || 0) }, 120);
    }
    async function goToDefinition() {
      const word = wordAtCursor();
      if (!word) { ctx.toast("光标不在符号上", true); return; }
      try {
        const result = await resolveSymbol(word.name);
        if (!result) { ctx.toast("没有找到定义：" + word.name, true); return; }
        await openLocation(result.rel, result.symbol.line, result.symbol.ch);
        ctx.setStatus("已跳转到 " + word.name + " 的定义");
      } catch (e) { ctx.toast(e.message || String(e), true); }
    }

    function builtinHoverAt(pos, word) {
      const editor = cm();
      if (!editor) return null;
      const before = editor.getLine(pos.line).slice(0, word.from ? word.from.ch : pos.ch);
      const obj = before.match(/([A-Za-z_$][\w$]*)\s*\.\s*$/);
      const full = obj ? obj[1] + "." + word.name : word.name;
      const sig = BUILTIN_SIGNATURES[full] || (obj ? BUILTIN_MEMBERS[word.name] : BUILTIN_MEMBERS[word.name]);
      if (sig) {
        const display = obj ? obj[1] + "." + word.name : word.name;
        return { name: display, kind: "method", params: sig.params, returns: sig.returns, type: "function", _builtin: true, signature: display + "(" + sig.params.map((p) => p.name + (p.type ? ": " + p.type : "")).join(", ") + ")" + (sig.returns ? ": " + sig.returns : "") };
      }
      if (obj && BUILTIN_PROPERTIES[word.name]) {
        const display = obj[1] + "." + word.name;
        return { name: display, kind: "property", type: BUILTIN_PROPERTIES[word.name], _builtin: true, signature: display + ": " + BUILTIN_PROPERTIES[word.name] };
      }
      if (BUILTIN_GLOBALS[word.name]) {
        const type = BUILTIN_GLOBALS[word.name];
        return { name: word.name, kind: "variable", type, _builtin: true, signature: word.name + ": " + type };
      }
      return null;
    }
    function hoverCardFor(sym, rel) {
      const label = KIND_LABEL[sym.kind] || "SYM";
      const doc = sym.doc || {};
      const meta = rel ? (rel + ":" + ((sym.line || 0) + 1)) : (sym._unknown ? "当前文件未识别" : sym._import ? "导入符号" : "内置 JavaScript API");
      let html = '<div class="hover-title"><span class="hover-kind">' + escHtml(label) + '</span><span class="hover-name">' + escHtml(sym.name) + '</span></div>';
      html += '<div class="hover-sig">' + escHtml(sym.signature || signatureFor(sym)) + '</div>';
      if (doc.description) html += '<div class="hover-doc">' + escHtml(doc.description) + '</div>';
      if (sym.params && sym.params.length) {
        const p = sym.params.map((x) => escHtml(x.name) + (x.type ? ": " + escHtml(x.type) : "") + (x.description ? " — " + escHtml(x.description) : "")).join("\n");
        html += '<div class="hover-doc">' + p + '</div>';
      }
      html += '<div class="hover-meta">' + escHtml(meta) + '</div>';
      return html;
    }
    function hideHover() {
      clearTimeout(hoverTimer);
      const el = document.getElementById("hoverCard");
      if (el) el.hidden = true;
    }
    function textOffsetInLine(lineEl, container, offset) {
      try {
        const range = document.createRange();
        range.setStart(lineEl, 0);
        range.setEnd(container, offset);
        return range.toString().length;
      } catch { return -1; }
    }
    function posFromMouse(editor, mouseEvent) {
      try {
        const line = editor.lineAtHeight(mouseEvent.clientY, "window");
        const pos = editor.coordsChar({ left: mouseEvent.clientX, top: mouseEvent.clientY }, "window");
        if (typeof line === "number" && line >= 0) return { line: line, ch: pos.ch };
      } catch { }
      return editor.coordsChar({ left: mouseEvent.clientX, top: mouseEvent.clientY }, "window");
    }
    function wordNear(editor, pos) {
      let word = wordAtPos(editor, pos);
      if (word) return word;
      for (const delta of [-1, 1, -2, 2, -3, 3]) {
        const ch = pos.ch + delta;
        if (ch < 0 || ch > editor.getLine(pos.line).length) continue;
        word = wordAtPos(editor, { line: pos.line, ch });
        if (word) return word;
      }
      return null;
    }
    function showHover(mouseEvent) {
      const editor = cm();
      if (!editor || !mouseEvent) return;
      const card = document.getElementById("hoverCard");
      if (!card) return;
      clearTimeout(hoverTimer);
      let pos;
      try { pos = posFromMouse(editor, mouseEvent); } catch (e) { return; }
      if (!pos || pos.line < 0 || pos.line >= editor.lineCount()) { hideHover(); return; }
      if (skipToken(pos)) { hideHover(); return; }
      const word = wordNear(editor, pos);
      if (!word) { hideHover(); return; }
      const analysis = currentAnalysis();
      const candidates = analysis.symbols.filter((s) => s.name === word.name);
      const local = candidates.find((s) => s.line === pos.line) || candidates.reduce((best, cur) => (!best || Math.abs((cur.line || 0) - pos.line) < Math.abs((best.line || 0) - pos.line) ? cur : best), null);
      let sym = local;
      let rel = st().currentRel;
      if (!sym && projectLoaded) {
        for (const [r, a] of projectIndex) {
          const found = a.symbols.find((s) => s.name === word.name);
          if (found) { sym = found; rel = r; break; }
        }
      }
      if (!sym) { sym = builtinHoverAt(pos, word); rel = ""; }
      if (!sym && analysis.imports[word.name]) {
        const imp = analysis.imports[word.name];
        sym = { name: word.name, kind: "import", type: "import", _import: true, signature: "import " + (imp.default ? word.name : "{ " + (imp.imported || word.name) + " }") + " from \"" + imp.source + "\"", doc: { description: "从 " + imp.source + " 导入的符号" } };
        rel = "";
      }
      if (!sym && !JS_RESERVED.has(word.name)) {
        const lineText = editor.getLine(pos.line) || "";
        const after = lineText.slice(word.to.ch);
        const prop = after.match(/^\s*:\s*([^,}]+)/);
        const propType = prop ? inferType(prop[1].trim()) : "";
        if (prop) {
          sym = { name: word.name, kind: "property", type: propType || "any", _unknown: true, signature: word.name + ": " + (propType || "any"), doc: { description: "对象字面量属性（未在当前文件的顶层符号表中）" } };
        } else {
          sym = { name: word.name, kind: "variable", type: "未知", _unknown: true, signature: word.name + ": 未知", doc: { description: "当前文件没有找到它的声明；可能是外部全局、未解析的局部变量或对象成员。" } };
        }
        rel = "";
      }
      if (!sym) { hideHover(); return; }
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        const rect = editor.getWrapperElement().getBoundingClientRect();
        card.innerHTML = hoverCardFor(sym, rel);
        card.hidden = false;
        const width = Math.min(card.offsetWidth || 420, 460);
        let left = mouseEvent.clientX + 16;
        let top = mouseEvent.clientY + 16;
        if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
        if (top + 180 > window.innerHeight - 12) top = Math.max(12, mouseEvent.clientY - 180);
        card.style.left = Math.max(8, left) + "px";
        card.style.top = Math.max(8, top) + "px";
      }, 180);
    }

    function callContext() {
      const editor = cm();
      if (!editor) return null;
      const cursor = editor.getCursor();
      if (skipToken(cursor)) return null;
      const before = editor.getRange({ line: 0, ch: 0 }, cursor);
      let depth = 0;
      let open = -1;
      for (let i = before.length - 1; i >= 0; i -= 1) {
        const ch = before[i];
        if (ch === ")") depth += 1;
        else if (ch === "(") {
          if (depth === 0) { open = i; break; }
          depth -= 1;
        }
      }
      if (open < 0) return null;
      const head = before.slice(0, open).match(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*$/);
      if (!head) return null;
      const callee = head[1];
      const args = before.slice(open + 1);
      let d = 0;
      let active = 0;
      let quote = "";
      for (let i = 0; i < args.length; i += 1) {
        const ch = args[i];
        if (quote) { if (ch === "\\") i += 1; else if (ch === quote) quote = ""; continue; }
        if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
        if (ch === "(" || ch === "[" || ch === "{") d += 1;
        else if (ch === ")" || ch === "]" || ch === "}") d -= 1;
        else if (ch === "," && d === 0) active += 1;
      }
      const name = callee.split(".").pop();
      const local = findLocal(name) || (callee.includes(".") ? null : null);
      const builtin = BUILTIN_SIGNATURES[callee];
      if (!local && !builtin) return null;
      return { sym: local || { name: callee, kind: "function", params: builtin.params, returns: builtin.returns, signature: callee + "(" + builtin.params.map((p) => p.name + (p.type ? ": " + p.type : "")).join(", ") + ")" + (builtin.returns ? ": " + builtin.returns : "") }, active, callee };
    }
    function updateParameterHint() {
      clearTimeout(paramTimer);
      paramTimer = setTimeout(() => {
        const el = document.getElementById("paramHint");
        if (!el) return;
        const context = callContext();
        if (!context) { el.hidden = true; return; }
        const sym = context.sym;
        const params = sym.params || [];
        const active = Math.min(context.active, Math.max(0, params.length - 1));
        const rendered = params.map((p, i) => '<span class="pm-param' + (i === active ? " active" : "") + '">' + escHtml(p.name) + (p.optional ? "?" : "") + (p.type ? '<span class="pm-type">: ' + escHtml(p.type) + '</span>' : "") + '</span>').join(", ");
        let html = '<span class="pm-tag">参数</span><span class="pm-name">' + escHtml(sym.name) + '</span>(' + rendered + ')' + (sym.returns ? '<span class="pm-return">: ' + escHtml(sym.returns) + '</span>' : "");
        if (params[active] && params[active].description) html += '\n<span class="pm-param">' + escHtml(params[active].description) + '</span>';
        el.innerHTML = html;
        el.hidden = false;
        const cursor = cm().cursorCoords(null, "window");
        const wrapRect = document.getElementById("editorWrap").getBoundingClientRect();
        let left = cursor.left - wrapRect.left + 10;
        let top = cursor.bottom - wrapRect.top + 8;
        const width = el.offsetWidth;
        const height = el.offsetHeight;
        if (left + width > wrapRect.width - 8) left = Math.max(8, wrapRect.width - width - 8);
        if (top + height > wrapRect.height - 8) top = Math.max(8, cursor.top - wrapRect.top - height - 8);
        el.style.left = Math.round(left) + "px";
        el.style.top = Math.round(top) + "px";
      }, 70);
    }
    function updateStatusType() {
      const el = document.getElementById("statusType");
      if (!el) return;
      const word = wordAtCursor();
      if (!word) { el.textContent = ""; return; }
      const sym = findLocal(word.name);
      if (!sym) { el.textContent = ""; return; }
      el.textContent = (KIND_LABEL[sym.kind] || "SYM") + "  " + (sym.type || sym.returns || "");
    }

    function renderRefs(name, refs) {
      const list = document.getElementById("refsList");
      const count = document.getElementById("refsCount");
      if (count) count.textContent = String(refs.length);
      if (!list) return;
      list.innerHTML = "";
      if (!refs.length) {
        list.innerHTML = '<div class="refs-empty">没有找到引用：' + escHtml(name) + '</div>';
        return;
      }
      for (const ref of refs) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ref-item";
        btn.dataset.rel = ref.rel;
        btn.dataset.line = String(ref.line);
        btn.innerHTML = '<span class="ref-head"><span class="ref-file">' + escHtml(ref.rel) + '</span><span class="ref-line">' + (ref.line + 1) + '</span></span><span class="ref-text">' + escHtml(ref.text) + '</span>';
        btn.addEventListener("click", () => openLocation(ref.rel, ref.line, ref.ch).catch((e) => ctx.toast(e.message || String(e), true)));
        list.appendChild(btn);
      }
    }
    function setSideTab(name) {
      const outlineBtn = document.getElementById("sideOutlineBtn");
      const refsBtn = document.getElementById("sideRefsBtn");
      const outline = document.getElementById("outlineList");
      const refs = document.getElementById("refsList");
      if (!outlineBtn || !refsBtn || !outline || !refs) return;
      outlineBtn.classList.toggle("active", name === "outline");
      refsBtn.classList.toggle("active", name === "refs");
      outline.hidden = name !== "outline";
      refs.hidden = name !== "refs";
    }
    async function findReferences() {
      const word = wordAtCursor();
      if (!word) { ctx.toast("光标不在符号上", true); return; }
      try {
        const index = await ensureProjectIndex();
        const refs = [];
        const re = new RegExp("\\b" + word.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g");
        for (const [rel, analysis] of index) {
          const text = analysis.text.split("\n");
          for (let i = 0; i < text.length; i += 1) {
            let m;
            re.lastIndex = 0;
            while ((m = re.exec(text[i]))) {
              refs.push({ rel, line: i, ch: m.index, text: text[i].trim() });
              if (refs.length >= 600) break;
            }
            if (refs.length >= 600) break;
          }
          if (refs.length >= 600) break;
        }
        renderRefs(word.name, refs);
        setSideTab("refs");
        ctx.setStatus("找到 " + refs.length + " 处引用：" + word.name);
        if (!refs.length) ctx.toast("没有找到引用：" + word.name);
      } catch (e) { ctx.toast(e.message || String(e), true); }
    }

    function askSymbol(title, message, value, hasInput, okText) {
      return new Promise((resolve) => {
        dialogResolve = resolve;
        const mask = document.getElementById("symbolDialogMask");
        document.getElementById("symbolDialogTitle").textContent = title || "";
        document.getElementById("symbolDialogMessage").textContent = message || "";
        const input = document.getElementById("symbolDialogInput");
        input.hidden = hasInput === false;
        input.value = value || "";
        document.getElementById("symbolDialogOk").textContent = okText || "确定";
        mask.hidden = false;
        setTimeout(() => { if (!input.hidden) { input.focus(); input.select(); } else document.getElementById("symbolDialogOk").focus(); }, 20);
      });
    }
    function closeSymbolDialog(ok) {
      const resolve = dialogResolve;
      dialogResolve = null;
      document.getElementById("symbolDialogMask").hidden = true;
      if (resolve) resolve(ok ? document.getElementById("symbolDialogInput").value.trim() : null);
    }
    async function renameSymbol() {
      const word = wordAtCursor();
      if (!word) { ctx.toast("光标不在符号上", true); return; }
      const next = await askSymbol("重命名符号", "当前名称：" + word.name, word.name, true, "重命名");
      if (next == null) return;
      if (!/^[A-Za-z_$][\w$]*$/.test(next)) { ctx.toast("不是合法的 JavaScript 标识符", true); return; }
      if (next === word.name) return;
      try {
        const index = await ensureProjectIndex();
        const re = new RegExp("\\b" + word.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g");
        let count = 0;
        const changes = [];
        for (const [rel, analysis] of index) {
          const matches = [...analysis.text.matchAll(re)];
          if (matches.length) { count += matches.length; changes.push({ rel, matches }); }
        }
        if (!count) { ctx.toast("没有找到可重命名的引用", true); return; }
        const ok = await askSymbol("确认重命名", "将 " + word.name + " 重命名为 " + next + "，共 " + count + " 处，涉及 " + changes.length + " 个文件。", "", false, "重命名");
        if (ok == null) return;
        for (const change of changes) {
          if (change.rel === st().currentRel) {
            const editor = cm();
            editor.operation(() => {
              for (let i = change.matches.length - 1; i >= 0; i -= 1) {
                const m = change.matches[i];
                const from = editor.posFromIndex(m.index);
                const to = editor.posFromIndex(m.index + m[0].length);
                editor.replaceRange(next, from, to);
              }
            });
          } else {
            const analysis = index.get(change.rel);
            let text = analysis.text;
            for (let i = change.matches.length - 1; i >= 0; i -= 1) {
              const m = change.matches[i];
              text = text.slice(0, m.index) + next + text.slice(m.index + m[0].length);
            }
            const res = await hostCall("host.workspace.save", { path: change.rel, data: ctx.encodeText(text) });
            if (!res || !res.ok) throw new Error((res && res.error) || ("保存失败：" + change.rel));
          }
        }
        invalidateProjectIndex();
        if (typeof ctx.afterMutation === "function") await ctx.afterMutation();
        ctx.toast("已重命名 " + count + " 处");
        ctx.setStatus("已重命名：" + word.name + " → " + next);
      } catch (e) { ctx.toast(e.message || String(e), true); }
    }

    function relativeSpec(fromRel, toRel) {
      const fromParts = dirname(fromRel).split("/").filter(Boolean);
      const toParts = toRel.split("/").filter(Boolean);
      let i = 0;
      while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) i += 1;
      const up = new Array(fromParts.length - i).fill("..");
      let rel = up.concat(toParts.slice(i)).join("/");
      rel = rel.replace(/\.(m?js|cjs|jsx|ts|tsx)$/i, "");
      if (!rel.startsWith(".")) rel = "./" + rel;
      return rel;
    }
    function importCandidatesFrom(index) {
      const current = currentAnalysis();
      const imported = new Set(Object.keys(current.imports));
      const local = new Set(current.symbols.map((s) => s.name));
      const out = [];
      const seen = new Set();
      for (const [rel, analysis] of index) {
        if (rel === st().currentRel) continue;
        for (const exp of analysis.exports) {
          if (!exp.name || exp.name === "default") continue;
          if (imported.has(exp.name) || local.has(exp.name)) continue;
          const key = exp.name + "|" + rel + "|" + (exp.isDefault ? "d" : "n");
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ name: exp.name, sourceRel: rel, isDefault: !!exp.isDefault, symbol: exp.symbol, kind: exp.symbol ? exp.symbol.kind : "variable" });
        }
      }
      return out.sort((a, b) => a.name.localeCompare(b.name));
    }
    function renderImportList(query) {
      const list = document.getElementById("importList");
      if (!list) return;
      const q = String(query || "").toLowerCase();
      const filtered = importCandidates.filter((c) => !q || c.name.toLowerCase().includes(q) || c.sourceRel.toLowerCase().includes(q));
      importActive = Math.min(importActive, Math.max(0, filtered.length - 1));
      list.innerHTML = "";
      if (!filtered.length) { list.innerHTML = '<div class="import-empty">没有匹配的导出符号</div>'; return; }
      filtered.forEach((candidate, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "import-item" + (i === importActive ? " active" : "");
        btn.innerHTML = '<span class="import-kind">' + escHtml(KIND_LABEL[candidate.kind] || "SYM") + '</span><span class="import-name">' + escHtml(candidate.name) + '</span><span class="import-from">' + escHtml(relativeSpec(st().currentRel, candidate.sourceRel)) + '</span>';
        btn.addEventListener("click", () => doImport(candidate));
        list.appendChild(btn);
      });
    }
    function insertImport(candidate) {
      const editor = cm();
      if (!editor) return;
      const spec = relativeSpec(st().currentRel, candidate.sourceRel);
      const importLine = candidate.isDefault ? 'import ' + candidate.name + ' from "' + spec + '";' : 'import { ' + candidate.name + ' } from "' + spec + '";';
      const lines = editor.getValue().split("\n");
      let insertAt = 0;
      for (let i = 0; i < lines.length; i += 1) if (/^\s*import\b/.test(lines[i])) insertAt = i + 1;
      const word = wordAtCursor();
      editor.operation(() => {
        editor.replaceRange(importLine + "\n", { line: insertAt, ch: 0 });
        const shift = insertAt <= (word ? word.from.line : editor.getCursor().line) ? 1 : 0;
        if (word) {
          editor.replaceRange(candidate.name, { line: word.from.line + shift, ch: word.from.ch }, { line: word.to.line + shift, ch: word.to.ch });
          editor.setCursor({ line: word.to.line + shift, ch: word.from.ch + candidate.name.length });
        } else {
          const pos = editor.getCursor();
          editor.replaceRange(candidate.name, { line: pos.line + shift, ch: pos.ch });
          editor.setCursor({ line: pos.line + shift, ch: pos.ch + candidate.name.length });
        }
      });
      editor.focus();
    }
    function doImport(candidate) {
      try {
        insertImport(candidate);
        closeImportPicker();
        ctx.toast("已导入：" + candidate.name);
        ctx.setStatus("已导入 " + candidate.name + " 从 " + candidate.sourceRel);
      } catch (e) { ctx.toast(e.message || String(e), true); }
    }
    function closeImportPicker() {
      const picker = document.getElementById("importPicker");
      if (picker) picker.hidden = true;
      importCandidates = [];
    }
    async function showAutoImport() {
      try {
        const index = await ensureProjectIndex();
        importCandidates = importCandidatesFrom(index);
        if (!importCandidates.length) { ctx.toast("项目里没有可导入的导出符号", true); return; }
        importActive = 0;
        const picker = document.getElementById("importPicker");
        const search = document.getElementById("importSearch");
        search.value = "";
        renderImportList("");
        picker.hidden = false;
        setTimeout(() => search.focus(), 20);
      } catch (e) { ctx.toast(e.message || String(e), true); }
    }

    function showActionsMenu() {
      const menu = document.getElementById("actionsMenu");
      const btn = document.getElementById("actionsBtn");
      if (!menu || !btn) return;
      const items = [
        ["跳转定义", "Ctrl+点击 / F12", () => goToDefinition()],
        ["查找引用", "Shift+F12", () => findReferences()],
        ["重命名符号", "F2", () => renameSymbol()],
        ["自动导入符号…", "Ctrl+.", () => showAutoImport()],
      ];
      menu.innerHTML = "";
      for (const [label, key, action] of items) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "action-item";
        b.innerHTML = '<span>' + escHtml(label) + '</span><span class="action-key">' + escHtml(key) + '</span>';
        b.addEventListener("click", () => { closeActionsMenu(); action().catch((e) => ctx.toast(e.message || String(e), true)); });
        menu.appendChild(b);
      }
      const r = btn.getBoundingClientRect();
      menu.hidden = false;
      menu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 230)) + "px";
      menu.style.top = Math.min(window.innerHeight - menu.offsetHeight - 8, r.bottom + 4) + "px";
    }
    function closeActionsMenu() { const m = document.getElementById("actionsMenu"); if (m) m.hidden = true; }

    function attachEditor(editor) {
      if (!editor) return;
      const wrapper = editor.getWrapperElement();
      const hoverHandler = (event) => showHover(event);
      wrapper.addEventListener("mousemove", hoverHandler);
      wrapper.addEventListener("mouseover", hoverHandler);
      document.addEventListener("mousemove", (event) => {
        if (event && event.target && event.target.closest && event.target.closest(".CodeMirror")) showHover(event);
      });
      wrapper.addEventListener("mouseleave", hideHover);
      editor.on("scroll", hideHover);
      editor.on("mousedown", (ed, event) => {
        hideHover();
        if (!event.ctrlKey && !event.metaKey) return;
        try {
          const pos = posFromMouse(ed, event);
          const word = wordAtPos(ed, pos);
          if (!word) return;
          ed.setCursor(pos);
          event.preventDefault();
          goToDefinition();
        } catch { }
      });
      editor.on("cursorActivity", () => { updateParameterHint(); updateStatusType(); });
      editor.on("change", () => { hideHover(); updateParameterHint(); });
      const extra = Object.assign({}, editor.getOption("extraKeys") || {});
      extra["F12"] = () => goToDefinition();
      extra["Shift-F12"] = () => findReferences();
      extra["F2"] = () => renameSymbol();
      extra["Ctrl-Shift-I"] = () => showAutoImport();
      extra["Ctrl-Alt-I"] = () => showAutoImport();
      extra["Ctrl-."] = () => showAutoImport();
      editor.setOption("extraKeys", extra);
    }

    function bindUi() {
      const hover = document.getElementById("hoverCard");
      if (hover && hover.parentElement !== document.body) document.body.appendChild(hover);
      const actions = document.getElementById("actionsBtn");
      if (actions) actions.addEventListener("click", (event) => { event.stopPropagation(); showActionsMenu(); });
      document.addEventListener("click", (event) => { if (!event.target.closest || !event.target.closest("#actionsMenu")) closeActionsMenu(); });
      const outline = document.getElementById("sideOutlineBtn");
      const refs = document.getElementById("sideRefsBtn");
      if (outline) outline.addEventListener("click", () => setSideTab("outline"));
      if (refs) refs.addEventListener("click", () => setSideTab("refs"));
      const importClose = document.getElementById("importClose");
      if (importClose) importClose.addEventListener("click", closeImportPicker);
      const importSearch = document.getElementById("importSearch");
      if (importSearch) importSearch.addEventListener("input", () => renderImportList(importSearch.value));
      const symbolCancel = document.getElementById("symbolDialogCancel");
      const symbolOk = document.getElementById("symbolDialogOk");
      const symbolInput = document.getElementById("symbolDialogInput");
      if (symbolCancel) symbolCancel.addEventListener("click", () => closeSymbolDialog(false));
      if (symbolOk) symbolOk.addEventListener("click", () => closeSymbolDialog(true));
      if (symbolInput) symbolInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") { event.preventDefault(); closeSymbolDialog(true); }
        else if (event.key === "Escape") { event.preventDefault(); closeSymbolDialog(false); }
      });
      window.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        closeActionsMenu();
        if (!document.getElementById("importPicker").hidden) closeImportPicker();
        if (!document.getElementById("symbolDialogMask").hidden) closeSymbolDialog(false);
      });
    }

    return {
      analyzeSource,
      currentAnalysis,
      invalidateProjectIndex,
      ensureProjectIndex,
      attachEditor,
      bindUi,
      goToDefinition,
      findReferences,
      renameSymbol,
      showAutoImport,
      showActionsMenu,
      hideHover,
      updateParameterHint,
      setSideTab,
    };
  }

  window.LyraLanguageCore = { analyzeSource: analyzeSource, inferType: inferType, BUILTIN_GLOBALS: BUILTIN_GLOBALS };
  window.createLyraLanguageService = create;
})();
