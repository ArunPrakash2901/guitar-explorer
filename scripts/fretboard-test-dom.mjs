// Deliberately small DOM adapter for the Lab's actual callbacks and renderer.
// Browser-only layout, native focus painting and touch sizing are reviewed in-browser.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

export const rendererSource = await readFile(new URL("../lab/fretboard-view.mjs", import.meta.url), "utf8");

export function createTestDOM(html = "") {
  let document;
  class Element {
    constructor(tagName = "div", namespaceURI = null) {
      this.tagName = tagName.toLowerCase(); this.namespaceURI = namespaceURI;
      this.children = []; this.parentElement = null; this.hidden = false; this.disabled = false;
      this.checked = false; this.value = ""; this.dataset = {}; this.attributes = {};
      this.handlers = new Map(); this._text = ""; this.className = ""; this.tabIndex = 0;
      this.scrollLeft = 0; this.scrollTop = 0; this.scrollCalls = [];
      this.style = { setProperty(name, value) { this[name] = String(value); }, removeProperty(name) { delete this[name]; } };
      this.classList = {
        contains: (name) => this.className.split(/\s+/).includes(name),
        add: (...names) => { this.className = [...new Set([...this.className.split(/\s+/).filter(Boolean), ...names])].join(" "); },
        remove: (...names) => { this.className = this.className.split(/\s+/).filter((name) => !names.includes(name)).join(" "); },
        toggle: (name, force) => { const show = force ?? !this.classList.contains(name); this.classList[show ? "add" : "remove"](name); return show; },
      };
    }
    get ownerDocument() { return document; }
    get textContent() { return this._text + this.children.map((child) => child.textContent).join(""); }
    set textContent(value) { this.replaceChildren(); this._text = String(value); }
    get firstChild() { return this.children[0] ?? null; }
    get isConnected() { return root.contains(this); }
    append(...children) {
      for (const child of children) {
        if (typeof child === "string") { const node = new Element("#text"); node._text = child; this.append(node); }
        else { child.remove(); child.parentElement = this; this.children.push(child); }
      }
    }
    appendChild(child) { this.append(child); return child; }
    contains(target) { return this === target || this.children.some((child) => child.contains(target)); }
    replaceChildren(...children) {
      if (document?.activeElement && this.children.some((child) => child.contains(document.activeElement))) document.activeElement = null;
      for (const child of this.children) child.parentElement = null;
      this.children = []; this._text = ""; this.append(...children);
    }
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((child) => child !== this); this.parentElement = null; }
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === "hidden") this.hidden = true;
      if (name === "disabled") this.disabled = true;
      if (name === "class") this.className = String(value);
      if (name === "tabindex") this.tabIndex = Number(value);
      if (name.startsWith("data-")) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
    }
    getAttribute(name) { return name === "class" ? this.className : this.attributes[name] ?? null; }
    hasAttribute(name) { return this.getAttribute(name) !== null; }
    removeAttribute(name) { delete this.attributes[name]; if (name === "hidden") this.hidden = false; if (name === "disabled") this.disabled = false; }
    addEventListener(name, handler) { this.handlers.set(name, [...(this.handlers.get(name) ?? []), handler]); }
    removeEventListener(name, handler) { this.handlers.set(name, (this.handlers.get(name) ?? []).filter((item) => item !== handler)); }
    focus() { if (!this.disabled) document.activeElement = this; }
    scrollIntoView(options) { this.scrollCalls.push(options); }
    getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 400, right: 1000, bottom: 400 }; }
    visible() { return !this.hidden && (!this.parentElement || this.parentElement.visible()); }
    dispatch(name, fields = {}) {
      const event = { target: this, currentTarget: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {}, ...fields };
      for (const handler of this.handlers.get(name) ?? []) handler(event);
      return event;
    }
    click() { assert.ok(this.visible(), "Cannot click a hidden control"); assert.equal(this.disabled, false, "Cannot click a disabled control"); this.dispatch("click"); }
    // Model the native button default only when the application has not prevented it.
    key(key) { const event = this.dispatch("keydown", { key }); if (!event.defaultPrevented && this.tagName === "button" && ["Enter", " "].includes(key)) this.click(); return event; }
    querySelectorAll(selector) { return all(this, (item) => item !== this && matches(item, selector)); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  }
  const elements = new Map(); const root = new Element("#document"); const stack = [root];
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  for (const token of html.matchAll(/<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>|[^<]+/g)) {
    const text = token[0]; if (text.startsWith("<!--")) continue;
    const close = /^<\/([\w-]+)/.exec(text); if (close) { if (stack.at(-1).tagName === close[1].toLowerCase()) stack.pop(); continue; }
    const open = /^<([\w-]+)\b([^>]*)>/.exec(text);
    if (!open) { const node = new Element("#text"); node._text = text; stack.at(-1).append(node); continue; }
    const element = new Element(open[1]);
    for (const match of open[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) element.setAttribute(match[1], match[2] ?? "");
    element.value = element.attributes.value ?? "";
    if (element.attributes.id) elements.set(element.attributes.id, element);
    stack.at(-1).append(element);
    if (!voidTags.has(element.tagName) && !text.endsWith("/>")) stack.push(element);
  }
  document = {
    activeElement: null,
    getElementById(id) { const found = elements.get(id) ?? find(root, (item) => item.getAttribute("id") === id); assert.ok(found, `Unknown DOM id ${id}`); return found; },
    createElement(tagName) { return new Element(tagName); },
    createElementNS(namespaceURI, tagName) { return new Element(tagName, namespaceURI); },
    querySelectorAll(selector) { return root.querySelectorAll(selector); },
    querySelector(selector) { return root.querySelector(selector); },
  };
  return { document, root, Element, $: (id) => document.getElementById(id) };
}

function matches(element, selector) {
  return selector.split(",").some((part) => {
    const value = part.trim();
    if (value.endsWith(":checked")) return element.checked && matches(element, value.slice(0, -8));
    if (value.startsWith(".")) return element.classList.contains(value.slice(1));
    if (value.startsWith("#")) return element.getAttribute("id") === value.slice(1);
    const attr = /^(\w+)?\[([\w-]+)(?:="([^"]*)")?\]$/.exec(value);
    if (attr) return (!attr[1] || element.tagName === attr[1]) && (attr[3] === undefined ? element.hasAttribute(attr[2]) : element.getAttribute(attr[2]) === attr[3]);
    return element.tagName === value;
  });
}

export function all(element, predicate) { return [element, ...element.children.flatMap((child) => all(child, () => true))].filter(predicate); }
export function find(element, predicate) { return all(element, predicate)[0]; }
export function accessibleText(root) {
  function visit(element) {
    if (element.hidden || element.getAttribute("aria-hidden") === "true" || ["head", "style", "script"].includes(element.tagName)) return "";
    return `${element._text} ${element.getAttribute("aria-label") ?? ""} ${element.getAttribute("title") ?? ""} ${element.children.map(visit).join(" ")}`;
  }
  return visit(root);
}

export function installRenderer(context) {
  vm.runInContext(rendererSource.replace(/^export\s+/gm, ""), context, { filename: "fretboard-view.mjs" });
}
