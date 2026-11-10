(() => {
  "use strict";

  const GLOBALS = new Set([
    "console", "window", "document", "globalThis", "self", "top", "parent", "frames",
    "Math", "JSON", "Object", "Array", "String", "Number", "Boolean", "Date", "RegExp",
    "Promise", "Map", "Set", "WeakMap", "WeakSet", "Symbol", "BigInt", "Proxy", "Reflect",
    "Error", "TypeError", "RangeError", "SyntaxError", "EvalError", "ReferenceError",
    "NaN", "Infinity", "undefined", "eval", "isFinite", "isNaN", "parseFloat", "parseInt",
    "encodeURI", "decodeURI", "encodeURIComponent", "decodeURIComponent", "escape", "unescape",
    "setTimeout", "clearTimeout", "setInterval", "clearInterval", "requestAnimationFrame",
    "cancelAnimationFrame", "requestIdleCallback", "cancelIdleCallback", "queueMicrotask",
    "fetch", "alert", "confirm", "prompt", "localStorage", "sessionStorage", "indexedDB",
    "location", "navigator", "history", "screen", "devicePixelRatio", "innerWidth", "innerHeight",
    "outerWidth", "outerHeight", "scrollX", "scrollY", "pageXOffset", "pageYOffset",
    "addEventListener", "removeEventListener", "dispatchEvent", "getComputedStyle", "matchMedia",
    "atob", "btoa", "TextEncoder", "TextDecoder", "URL", "URLSearchParams", "Blob", "File",
    "FileReader", "FormData", "Headers", "Request", "Response", "AbortController", "AbortSignal",
    "Image", "Audio", "Option", "WebSocket", "XMLHttpRequest", "MutationObserver",
    "IntersectionObserver", "ResizeObserver", "CustomEvent", "Event", "EventTarget", "Node",
    "Element", "HTMLElement", "HTMLDocument", "DocumentFragment", "NodeList", "HTMLCollection",
    "DOMParser", "XMLSerializer", "Notification", "Worker", "SharedWorker", "ServiceWorker",
    "crypto", "performance", "structuredClone", "arguments", "require", "module", "exports",
    "process", "Buffer", "__dirname", "__filename", "WebAssembly", "Intl", "reportError",
    "CSS", "CSSStyleSheet", "HTMLCanvasElement", "CanvasRenderingContext2D",
  ]);
  const TERMINATORS = new Set(["ReturnStatement", "ThrowStatement", "BreakStatement", "ContinueStatement"]);
  const PARAM_KINDS = new Set(["param", "catch"]);

  function analyzeAst(code) {
    const acorn = window.acorn || (typeof acorn !== "undefined" ? acorn : null);
    if (!acorn || typeof acorn.parse !== "function") throw new Error("语法解析库没有加载");
    return acorn.parse(code, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
      allowHashBang: true,
      allowAwaitOutsideFunction: true,
    });
  }

  function lintCode(code) {
    const problems = [];
    let ast;
    try {
      ast = analyzeAst(code);
    } catch (err) {
      const line = err && err.loc ? err.loc.line : 1;
      const col = err && err.loc ? err.loc.column : 0;
      problems.push({ line, ch: col, severity: "error", rule: "syntax", message: "语法错误：" + String(err && err.message || err).replace(/\s*\(\d+:\d+\)$/, "") });
      return problems;
    }

    const declarations = [];
    const declaredNodes = new Set();
    const refs = new Map();

    function addDecl(name, kind, node, isExported) {
      if (!name || declaredNodes.has(node)) return;
      declaredNodes.add(node);
      declarations.push({ name, kind, node, line: node.loc.start.line, ch: node.loc.start.column, exported: !!isExported });
    }

    function collectPattern(node, kind, isExported) {
      if (!node) return;
      switch (node.type) {
        case "Identifier": addDecl(node.name, kind, node, isExported); break;
        case "ObjectPattern":
          for (const prop of node.properties || []) {
            if (prop.type === "RestElement") collectPattern(prop.argument, kind, isExported);
            else {
              if (prop.shorthand && prop.key && prop.key.type === "Identifier") declaredNodes.add(prop.key);
              if (prop.value) collectPattern(prop.value, kind, isExported);
            }
          }
          break;
        case "ArrayPattern":
          for (const item of node.elements || []) collectPattern(item, kind, isExported);
          break;
        case "AssignmentPattern": collectPattern(node.left, kind, isExported); break;
        case "RestElement": collectPattern(node.argument, kind, isExported); break;
      }
    }

    function forEachChild(node, callback) {
      for (const key in node) {
        if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
        if (key === "loc" || key === "start" || key === "end" || key === "range" || key === "type") continue;
        const value = node[key];
        if (Array.isArray(value)) {
          for (const child of value) if (child && typeof child.type === "string") callback(child, node, key);
        } else if (value && typeof value.type === "string") {
          callback(value, node, key);
        }
      }
    }

    function visitDecls(node, ancestors) {
      const isExported = ancestors.some((a) => a.type === "ExportNamedDeclaration" || a.type === "ExportDefaultDeclaration");
      switch (node.type) {
        case "FunctionDeclaration":
        case "FunctionExpression":
        case "ArrowFunctionExpression":
          if (node.id) addDecl(node.id.name, "function", node.id, isExported);
          for (const param of node.params || []) collectPattern(param, "param", isExported);
          break;
        case "ClassDeclaration":
        case "ClassExpression":
          if (node.id) addDecl(node.id.name, "class", node.id, isExported);
          break;
        case "VariableDeclarator":
          collectPattern(node.id, "variable", isExported);
          break;
        case "ImportSpecifier":
        case "ImportDefaultSpecifier":
        case "ImportNamespaceSpecifier":
          if (node.local) addDecl(node.local.name, "import", node.local, false);
          break;
        case "CatchClause":
          if (node.param) collectPattern(node.param, "catch", false);
          break;
      }
      ancestors.push(node);
      forEachChild(node, (child) => visitDecls(child, ancestors));
      ancestors.pop();
    }
    visitDecls(ast, []);

    function isReference(node, parent) {
      if (!parent) return true;
      switch (parent.type) {
        case "MemberExpression": return parent.object === node || !!parent.computed;
        case "Property":
          if (parent.shorthand) return true;
          if (parent.key === node && !parent.computed) return false;
          return true;
        case "MethodDefinition":
        case "PropertyDefinition": return parent.key !== node || !!parent.computed;
        case "LabeledStatement":
        case "BreakStatement":
        case "ContinueStatement":
        case "ImportSpecifier":
        case "ImportDefaultSpecifier":
        case "ImportNamespaceSpecifier":
        case "MetaProperty":
        case "ObjectPattern":
        case "ArrayPattern":
        case "AssignmentPattern":
        case "RestElement":
          return false;
        case "ExportSpecifier": return parent.local === node;
        case "VariableDeclarator": return parent.id !== node;
        case "FunctionDeclaration":
        case "FunctionExpression":
        case "ArrowFunctionExpression":
          if (parent.id === node) return false;
          if (parent.params && parent.params.includes(node)) return false;
          return true;
        case "ClassDeclaration":
        case "ClassExpression": return parent.id !== node;
      }
      return true;
    }

    function addRef(node) {
      const item = refs.get(node.name);
      if (item) item.count += 1;
      else refs.set(node.name, { count: 1, node });
    }

    function visitRefs(node, parent) {
      if (node.type === "Identifier") {
        if (!declaredNodes.has(node) && isReference(node, parent)) addRef(node);
        return;
      }
      if (node.type === "PrivateIdentifier") return;
      forEachChild(node, (child, childParent) => visitRefs(child, childParent));
    }
    visitRefs(ast, null);

    const reported = new Set();
    function pushProblem(line, ch, severity, rule, message) {
      const key = rule + ":" + line + ":" + ch + ":" + message;
      if (reported.has(key) || problems.length >= 300) return;
      reported.add(key);
      problems.push({ line, ch, severity, rule, message });
    }

    for (const decl of declarations) {
      const name = decl.name;
      if (!name || name.startsWith("_") || decl.exported || PARAM_KINDS.has(decl.kind)) continue;
      const used = refs.get(name);
      if (!used || used.count === 0) pushProblem(decl.line, decl.ch, "warning", "no-unused-vars", "已声明但未使用：'" + name + "'");
    }

    for (const [name, item] of refs) {
      if (GLOBALS.has(name) || name.startsWith("_")) continue;
      if (!declarations.some((d) => d.name === name)) pushProblem(item.node.loc.start.line, item.node.loc.start.column, "warning", "no-undef", "未定义的变量：'" + name + "'");
    }

    function checkFunction(node) {
      if (!node || !node.params) return;
      const seen = new Set();
      for (const param of node.params) {
        const names = [];
        (function collect(p) {
          if (!p) return;
          if (p.type === "Identifier") names.push(p.name);
          else if (p.type === "AssignmentPattern") collect(p.left);
          else if (p.type === "RestElement") collect(p.argument);
          else if (p.type === "ObjectPattern") for (const prop of p.properties || []) collect(prop.value || prop.argument);
          else if (p.type === "ArrayPattern") for (const item of p.elements || []) collect(item);
        })(param);
        for (const name of names) {
          if (seen.has(name)) pushProblem(param.loc.start.line, param.loc.start.column, "warning", "no-dupe-args", "参数重复：'" + name + "'");
          seen.add(name);
        }
      }
    }

    const promiseFunctions = new Set();
    function containsPromise(node) {
      if (!node || typeof node.type !== "string") return false;
      if (node.type === "NewExpression" && node.callee && node.callee.name === "Promise") return true;
      if (node.type === "ReturnStatement" && node.argument) {
        if (node.argument.type === "NewExpression" && node.argument.callee && node.argument.callee.name === "Promise") return true;
        if (node.argument.type === "CallExpression" && node.argument.callee && /^Promise\./.test(node.argument.callee.name || "")) return true;
      }
      let found = false;
      forEachChild(node, (child) => { if (!found && containsPromise(child)) found = true; });
      return found;
    }
    function collectPromiseFunctions(node) {
      if (!node || typeof node.type !== "string") return;
      if (node.type === "FunctionDeclaration" && node.id && (node.async || containsPromise(node.body))) promiseFunctions.add(node.id.name);
      if (node.type === "VariableDeclarator" && node.id && node.id.type === "Identifier" && node.init) {
        if (node.init.type === "ArrowFunctionExpression" || node.init.type === "FunctionExpression") {
          if (node.init.async || containsPromise(node.init.body)) promiseFunctions.add(node.id.name);
        }
      }
      forEachChild(node, collectPromiseFunctions);
    }
    collectPromiseFunctions(ast);

    const unsafeParams = new Map();
    function paramNamesOf(node) {
      const out = [];
      for (const param of node.params || []) {
        (function collect(p, index) {
          if (!p) return;
          if (p.type === "Identifier") out.push(p.name);
          else if (p.type === "AssignmentPattern") collect(p.left);
          else if (p.type === "RestElement") collect(p.argument);
          else if (p.type === "ObjectPattern") for (const prop of p.properties || []) collect(prop.value || prop.argument);
          else if (p.type === "ArrayPattern") for (const item of p.elements || []) collect(item);
        })(param);
      }
      return out;
    }
    function collectUnsafe(node) {
      if (!node || typeof node.type !== "string") return;
      if (node.type === "FunctionDeclaration" && node.id && node.params) {
        const params = paramNamesOf(node);
        const names = new Set(params);
        const unsafe = new Set();
        const scan = (child) => {
          if (!child || typeof child.type !== "string") return;
          if (child.type === "MemberExpression" && child.object && child.object.type === "Identifier" && names.has(child.object.name)) unsafe.add(child.object.name);
          forEachChild(child, scan);
        };
        scan(node.body);
        if (unsafe.size) unsafeParams.set(node.id.name, unsafe);
      }
      if (node.type === "VariableDeclarator" && node.id && node.id.type === "Identifier" && node.init && (node.init.type === "ArrowFunctionExpression" || node.init.type === "FunctionExpression") && node.init.params) {
        const params = paramNamesOf(node.init);
        const names = new Set(params);
        const unsafe = new Set();
        const scan = (child) => {
          if (!child || typeof child.type !== "string") return;
          if (child.type === "MemberExpression" && child.object && child.object.type === "Identifier" && names.has(child.object.name)) unsafe.add(child.object.name);
          forEachChild(child, scan);
        };
        scan(node.init.body);
        if (unsafe.size) unsafeParams.set(node.id.name, unsafe);
      }
      forEachChild(node, collectUnsafe);
    }
    collectUnsafe(ast);

    function walkChecks(node) {
      if (!node || typeof node.type !== "string") return;
      if (node.type === "BinaryExpression" && (node.operator === "==" || node.operator === "!=")) {
        const isNull = (n) => n && n.type === "Literal" && n.value === null;
        if (!isNull(node.left) && !isNull(node.right)) pushProblem(node.loc.start.line, node.loc.start.column, "warning", "eqeqeq", "建议使用 " + node.operator + "= 而不是 " + node.operator);
      }
      if (node.type === "DebuggerStatement") pushProblem(node.loc.start.line, node.loc.start.column, "warning", "no-debugger", "不要在生产代码中留下 debugger");
      if (node.type === "ExpressionStatement" && node.expression && node.expression.type === "CallExpression") {
        const callee = node.expression.callee;
        if (callee && callee.type === "Identifier" && promiseFunctions.has(callee.name)) {
          pushProblem(callee.loc.start.line, callee.loc.start.column, "warning", "unhandled-promise", "调用了返回 Promise 的函数 '" + callee.name + "'，但没有 catch / await，可能产生未处理的异步错误");
        }
      }
      if ((node.type === "WhileStatement" || node.type === "ForStatement") && node.test && node.test.type === "BinaryExpression" && (node.test.operator === "<=" || node.test.operator === ">=")) {
        const sides = [node.test.left, node.test.right];
        const lengthSide = sides.find((side) => side && side.type === "MemberExpression" && side.property && side.property.name === "length");
        if (lengthSide) pushProblem(node.test.loc.start.line, node.test.loc.start.column, "warning", "possible-off-by-one", "循环条件使用 " + node.test.operator + " .length，最后一次循环可能越界");
      }
      if (node.type === "MemberExpression" && !node.computed && node.object && ((node.object.type === "Identifier" && node.object.name === "undefined") || (node.object.type === "Literal" && node.object.value === null))) {
        pushProblem(node.loc.start.line, node.loc.start.column, "warning", "possible-type-error", "对 " + (node.object.name || "null") + " 访问属性会抛出 TypeError");
      }
      if (node.type === "CallExpression" && node.callee && node.callee.type === "Identifier" && unsafeParams.has(node.callee.name)) {
        const unsafe = unsafeParams.get(node.callee.name);
        const args = node.arguments || [];
        for (let i = 0; i < args.length; i += 1) {
          const arg = args[i];
          const isNull = arg && arg.type === "Literal" && arg.value === null;
          const isUndefined = arg && arg.type === "Identifier" && arg.name === "undefined";
          if (isNull || isUndefined) {
            const callName = node.callee.name;
            if (unsafe.size) pushProblem(arg.loc.start.line, arg.loc.start.column, "warning", "possible-param-type-error", "调用 '" + callName + "' 时第 " + (i + 1) + " 个参数是 " + (isNull ? "null" : "undefined") + "，函数内可能访问它的属性并抛出 TypeError");
          }
        }
      }
      if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") checkFunction(node);
      if (node.type === "ObjectExpression") {
        const keys = new Set();
        for (const prop of node.properties || []) {
          if (prop.type !== "Property" || prop.computed) continue;
          const key = prop.key;
          const name = key && (key.type === "Identifier" ? key.name : key.type === "Literal" ? String(key.value) : "");
          if (!name) continue;
          if (keys.has(name)) pushProblem(prop.key.loc.start.line, prop.key.loc.start.column, "warning", "no-dupe-keys", "对象字面量键重复：'" + name + "'");
          keys.add(name);
        }
      }
      if (node.type === "BlockStatement" || node.type === "Program") {
        let terminated = false;
        for (const stmt of node.body || []) {
          if (terminated && !["FunctionDeclaration", "EmptyStatement"].includes(stmt.type)) pushProblem(stmt.loc.start.line, stmt.loc.start.column, "warning", "no-unreachable", "这行代码不可达");
          if (TERMINATORS.has(stmt.type)) terminated = true;
        }
      }
      forEachChild(node, (child) => walkChecks(child));
    }
    walkChecks(ast);

    function analyzeTypes(ast) {
      const out = [];
      const stringMethods = new Set(["toUpperCase", "toLowerCase", "trim", "trimStart", "trimEnd", "split", "slice", "substring", "substr", "replace", "replaceAll", "startsWith", "endsWith", "includes", "padStart", "padEnd", "charAt", "charCodeAt", "indexOf", "lastIndexOf", "match", "matchAll", "search", "repeat", "concat"]);
      const numberMethods = new Set(["toFixed", "toExponential", "toPrecision", "toString", "valueOf"]);
      function warn(node, rule, message) {
        out.push({ line: node.loc.start.line, ch: node.loc.start.column, severity: "warning", rule: rule, message: message });
      }
      function scopeChild(parent) { return { vars: new Map(), parent: parent }; }
      function lookup(scope, name) {
        let cur = scope;
        while (cur) { if (cur.vars.has(name)) return cur.vars.get(name); cur = cur.parent; }
        return null;
      }
      function declare(scope, name, info) { if (name) scope.vars.set(name, info || { type: "unknown" }); }
      function literalInfo(node) {
        if (!node) return { type: "unknown" };
        if (node.type === "Literal") {
          if (node.value === null) return { type: "null", value: null };
          if (typeof node.value === "number") return { type: "number", value: node.value };
          if (typeof node.value === "string") return { type: "string", value: node.value };
          if (typeof node.value === "boolean") return { type: "boolean", value: node.value };
          if (node.regex) return { type: "regexp" };
        }
        if (node.type === "TemplateLiteral") return { type: "string" };
        if (node.type === "ArrayExpression") return { type: "array", arrayLength: (node.elements || []).length };
        if (node.type === "ObjectExpression") return { type: "object" };
        if ((node.type === "FunctionExpression") || (node.type === "ArrowFunctionExpression")) return { type: "function", callable: true };
        if (node.type === "ClassExpression") return { type: "class", callable: true };
        return { type: "unknown" };
      }
      function infer(node, scope) {
        if (!node) return { type: "unknown" };
        switch (node.type) {
          case "Identifier": {
            if (node.name === "undefined") return { type: "undefined", value: undefined };
            if (node.name === "NaN") return { type: "number" };
            if (node.name === "Infinity") return { type: "number" };
            return lookup(scope, node.name) || { type: "unknown" };
          }
          case "Literal":
          case "TemplateLiteral":
          case "ArrayExpression":
          case "ObjectExpression":
          case "FunctionExpression":
          case "ArrowFunctionExpression":
          case "ClassExpression":
            return literalInfo(node);
          case "UnaryExpression": {
            const arg = infer(node.argument, scope);
            if (node.operator === "typeof") return { type: "string" };
            if (node.operator === "!") return { type: "boolean" };
            if (node.operator === "-" || node.operator === "+") return { type: "number" };
            return arg;
          }
          case "BinaryExpression": {
            const op = node.operator;
            if (["==", "!=", "===", "!==", "<", "<=", ">", ">=", "instanceof", "in"].includes(op)) return { type: "boolean" };
            if (["-", "*", "/", "%", "**", "<<", ">>", ">>>", "&", "|", "^"].includes(op)) return { type: "number" };
            if (op === "+") {
              const left = infer(node.left, scope);
              const right = infer(node.right, scope);
              return left.type === "string" || right.type === "string" ? { type: "string" } : { type: "number" };
            }
            return { type: "unknown" };
          }
          case "LogicalExpression": {
            const left = infer(node.left, scope);
            const right = infer(node.right, scope);
            return right.type !== "unknown" ? right : left;
          }
          case "ConditionalExpression": {
            const a = infer(node.consequent, scope);
            const b = infer(node.alternate, scope);
            return a.type === b.type ? a : { type: "unknown" };
          }
          case "AssignmentExpression":
            return infer(node.right, scope);
          case "SequenceExpression":
            return node.expressions && node.expressions.length ? infer(node.expressions[node.expressions.length - 1], scope) : { type: "unknown" };
          case "NewExpression": {
            const callee = node.callee;
            if (callee && callee.type === "Identifier" && callee.name === "Array") {
              const arg = node.arguments && node.arguments[0];
              let num = null;
              if (arg && arg.type === "Literal" && typeof arg.value === "number") num = arg.value;
              else if (arg && arg.type === "UnaryExpression" && arg.operator === "-" && arg.argument && arg.argument.type === "Literal" && typeof arg.argument.value === "number") num = -arg.argument.value;
              if (num != null && num < 0) warn(node, "invalid-array-length", "new Array(" + num + ") 会抛出 RangeError：数组长度不能为负数");
              return { type: "array", arrayLength: -1 };
            }
            if (callee && callee.type === "Identifier" && /Error$/.test(callee.name)) return { type: "object" };
            return { type: "object" };
          }
          case "MemberExpression": {
            const base = infer(node.object, scope);
            if (base.type === "undefined" || base.type === "null") {
              warn(node, "possible-type-error", (base.type === "undefined" ? "undefined" : "null") + " 不能读取属性 '" + (node.property && node.property.name || "?") + "'，运行时会抛 TypeError");
            }
            if (node.object && node.object.type === "MemberExpression" && node.object.computed && node.object.property && node.object.property.type === "Literal" && typeof node.object.property.value === "number") {
              const root = infer(node.object.object, scope);
              if (root.type === "array" && root.arrayLength >= 0 && node.object.property.value >= root.arrayLength) {
                warn(node.object, "array-out-of-bounds", "数组长度为 " + root.arrayLength + "，访问下标 " + node.object.property.value + " 会得到 undefined");
              }
            }
            const propName = node.property && (node.property.name || (node.property.type === "Literal" ? node.property.value : ""));
            if (base.type === "number" || base.type === "boolean") {
              if (stringMethods.has(propName) && !numberMethods.has(propName)) warn(node, "type-mismatch", base.type + " 类型没有 '" + propName + "' 方法");
            }
            if (base.type === "string" && numberMethods.has(propName)) warn(node, "type-mismatch", "string 类型没有 '" + propName + "' 方法");
            if (propName === "length" && ["string", "array"].includes(base.type)) return { type: "number" };
            if (base.type === "string" && stringMethods.has(propName)) return { type: "function", callable: true };
            if (base.type === "array") return { type: "unknown" };
            if (base.type === "object") return { type: "unknown" };
            return { type: "unknown" };
          }
          case "CallExpression": {
            const callee = node.callee;
            for (const arg of node.arguments || []) infer(arg, scope);
            const target = infer(callee, scope);
            if (target && target.type !== "unknown" && target.type !== "function" && target.type !== "class" && !target.callable) {
              warn(callee, "call-non-function", "尝试调用 " + target.type + " 类型的值，运行时会抛 TypeError；如果它有值可能是 '" + (target.value != null ? String(target.value) : target.type) + "'");
            }
            if (callee && callee.type === "Identifier" && (callee.name === "decodeURIComponent" || callee.name === "decodeURI") && node.arguments && node.arguments[0] && node.arguments[0].type === "Literal" && typeof node.arguments[0].value === "string") {
              const value = node.arguments[0].value;
              if (/%/.test(value) && /%(?![0-9A-Fa-f]{2})/.test(value)) warn(node, "invalid-uri", callee.name + " 收到非法百分号转义，会抛 URIError");
            }
            if (callee && callee.type === "MemberExpression" && callee.object && callee.object.type === "Identifier" && callee.object.name === "JSON" && callee.property && callee.property.name === "parse" && node.arguments && node.arguments[0] && node.arguments[0].type === "Literal" && typeof node.arguments[0].value === "string") {
              try { JSON.parse(node.arguments[0].value); }
              catch (err) { warn(node, "invalid-json", "JSON.parse 的字符串不是合法 JSON，会抛 SyntaxError"); }
            }
            return { type: "unknown" };
          }
        }
        return { type: "unknown" };
      }

      function analyzeFunction(node, parentScope, selfName) {
        const scope = scopeChild(parentScope);
        for (const param of node.params || []) {
          if (param.type === "Identifier") declare(scope, param.name, { type: "unknown" });
          else if (param.type === "AssignmentPattern" && param.left.type === "Identifier") declare(scope, param.left.name, { type: "unknown" });
        }
        if (node.body && node.body.type === "BlockStatement") {
          if (selfName && !node.async) {
            const hasConditional = (node.body.body || []).some((stmt) => ["IfStatement", "SwitchStatement", "ForStatement", "WhileStatement", "DoWhileStatement", "TryStatement"].includes(stmt.type));
            const direct = (node.body.body || []).some((stmt) => stmt.type === "ReturnStatement" && stmt.argument && stmt.argument.type === "CallExpression" && stmt.argument.callee && stmt.argument.callee.type === "Identifier" && stmt.argument.callee.name === selfName);
            if (direct && !hasConditional) warn(node.id || node, "unconditional-recursion", "递归函数 '" + selfName + "' 没有终止条件，会因栈溢出抛 RangeError");
          }
          analyzeStatements(node.body.body, scope);
        } else if (node.body) infer(node.body, scope);
      }

      function analyzeStatements(list, scope) {
        for (const stmt of list || []) {
          if (!stmt) continue;
          if (stmt.type === "VariableDeclaration") {
            for (const decl of stmt.declarations || []) {
              const info = infer(decl.init, scope);
              if (decl.id && decl.id.type === "Identifier") declare(scope, decl.id.name, info);
            }
            continue;
          }
          if (stmt.type === "FunctionDeclaration" && stmt.id) {
            declare(scope, stmt.id.name, { type: "function", callable: true, value: stmt.id.name });
            analyzeFunction(stmt, scope, stmt.id.name);
            continue;
          }
          if (stmt.type === "ClassDeclaration" && stmt.id) {
            declare(scope, stmt.id.name, { type: "class", callable: true });
            for (const member of stmt.body && stmt.body.body || []) {
              if (member.type === "MethodDefinition" && member.value) analyzeFunction(member.value, scope, null);
            }
            continue;
          }
          if (stmt.type === "ExpressionStatement") { infer(stmt.expression, scope); continue; }
          if (stmt.type === "ReturnStatement" || stmt.type === "ThrowStatement") { if (stmt.argument) infer(stmt.argument, scope); continue; }
          if (stmt.type === "IfStatement") {
            infer(stmt.test, scope);
            if (stmt.consequent) { if (stmt.consequent.type === "BlockStatement") analyzeStatements(stmt.consequent.body, scopeChild(scope)); else analyzeStatements([stmt.consequent], scopeChild(scope)); }
            if (stmt.alternate) { if (stmt.alternate.type === "BlockStatement") analyzeStatements(stmt.alternate.body, scopeChild(scope)); else analyzeStatements([stmt.alternate], scopeChild(scope)); }
            continue;
          }
          if (stmt.type === "ForStatement") {
            const s = scopeChild(scope);
            if (stmt.init) { if (stmt.init.type === "VariableDeclaration") analyzeStatements([stmt.init], s); else infer(stmt.init, s); }
            if (stmt.test) infer(stmt.test, s);
            if (stmt.update) infer(stmt.update, s);
            if (stmt.body) { if (stmt.body.type === "BlockStatement") analyzeStatements(stmt.body.body, s); else analyzeStatements([stmt.body], s); }
            continue;
          }
          if ((stmt.type === "WhileStatement") || (stmt.type === "DoWhileStatement")) {
            infer(stmt.test, scope);
            if (stmt.body) { if (stmt.body.type === "BlockStatement") analyzeStatements(stmt.body.body, scopeChild(scope)); else analyzeStatements([stmt.body], scopeChild(scope)); }
            continue;
          }
          if (stmt.type === "TryStatement") {
            analyzeStatements(stmt.block && stmt.block.body, scopeChild(scope));
            if (stmt.handler) {
              const cs = scopeChild(scope);
              if (stmt.handler.param && stmt.handler.param.type === "Identifier") declare(cs, stmt.handler.param.name, { type: "object" });
              analyzeStatements(stmt.handler.body && stmt.handler.body.body, cs);
            }
            if (stmt.finalizer) analyzeStatements(stmt.finalizer.body, scopeChild(scope));
            continue;
          }
          if (stmt.type === "BlockStatement") { analyzeStatements(stmt.body, scopeChild(scope)); continue; }
          if (stmt.type === "SwitchStatement") {
            infer(stmt.discriminant, scope);
            for (const c of stmt.cases || []) { if (c.test) infer(c.test, scope); analyzeStatements(c.consequent, scopeChild(scope)); }
            continue;
          }
          if (stmt.type === "LabeledStatement") { analyzeStatements([stmt.body], scope); continue; }
          if (stmt.type === "ExportNamedDeclaration" || stmt.type === "ExportDefaultDeclaration") { if (stmt.declaration) analyzeStatements([stmt.declaration], scope); continue; }
          forEachChild(stmt, (child) => { if (child.type !== "Identifier") { try { infer(child, scope); } catch (e) {} } });
        }
      }
      analyzeStatements(ast.body || [], { vars: new Map(), parent: null });
      return out;
    }

    const typeProblems = analyzeTypes(ast);
    for (const problem of typeProblems) {
      const key = problem.rule + ":" + problem.line + ":" + problem.ch + ":" + problem.message;
      if (!reported.has(key) && problems.length < 300) { reported.add(key); problems.push(problem); }
    }

    problems.sort((a, b) => a.line - b.line || a.ch - b.ch);
    return problems;
  }

  function formatCode(code, kind) {
    const text = String(code || "");
    if (kind === "json") return JSON.stringify(JSON.parse(text), null, 2) + "\n";
    const beautify = window.js_beautify || (typeof js_beautify !== "undefined" ? js_beautify : null);
    if (typeof beautify !== "function") throw new Error("代码格式化库没有加载");
    let out = beautify(text, { indent_size: 2, indent_char: " ", brace_style: "collapse", preserve_newlines: true, max_preserve_newlines: 2, end_with_newline: true, space_before_conditional: true, wrap_line_length: 0 });
    out = out.replace(/(^\s*(?:import|export)\s*)\{\s*([\s\S]*?)\s*\}\s*(from\s+["'][^"']+["'])/gm, (match, head, body, tail) => {
      const names = body.split(",").map((x) => x.trim()).filter(Boolean);
      const oneLine = head.trim() + " { " + names.join(", ") + " } " + tail.trim();
      return oneLine.length <= 110 && !body.includes("//") && !body.includes("/*") ? oneLine : match;
    });
    return out;
  }

  window.LyraJSTools = { lintCode: lintCode, formatCode: formatCode };
})();
