/**
 * Presentation only. Labels, states, disclosure and relationships come from the
 * consumer; this module has no musical or session dependencies.
 *
 * update({ strings: [{ index, label }], activeStringIndices, fretRange,
 *   positions: [{ stringIndex, fret, selectable?, selected?, states?,
 *     primaryLabel?, secondaryLabel?, ariaLabel? }],
 *   connections?: [{ from, to, kind: 'stationary'|'up'|'down', label?, emphasis? }],
 *   label? })
 * Strings are supplied in physical, top-to-bottom display order. A position is
 * interactive only when selectable is true. Never pass unrevealed answers here.
 */

const SVG_NS = "http://www.w3.org/2000/svg";
const STRING_GAP = 64;
const FIRST_STRING_Y = 82;
const LABEL_WIDTH = 112;
const OPEN_WIDTH = 72;
const RIGHT_PADDING = 28;
const STATES = new Set([
  "current", "previous", "selected", "correct", "incorrect", "common",
  "source", "destination", "resolution", "disabled",
]);
let nextId = 0;

const keyOf = ({ stringIndex, fret }) => `${stringIndex}:${fret}`;

/** Equal-tempered physical fret spacing, enlarged to preserve touch targets. */
export function fretboardGeometry({ strings, fretRange }) {
  const { minFret, maxFret } = fretRange;
  if (!Number.isInteger(minFret) || !Number.isInteger(maxFret) || minFret < 0 || maxFret < minFret) {
    throw new RangeError("Fretboard display range must contain ordered nonnegative integer frets.");
  }
  const visibleFrets = Array.from({ length: maxFret - minFret + 1 }, (_, index) => minFret + index);
  const firstFretted = Math.max(1, minFret);
  const boundary = (fret) => 1 - 2 ** (-fret / 12);
  const scale = 64 / (boundary(Math.max(1, maxFret)) - boundary(Math.max(1, maxFret) - 1));
  const neckLeft = LABEL_WIDTH + (minFret === 0 ? OPEN_WIDTH : 0);
  const start = boundary(firstFretted - 1);
  const fretBoundary = (fret) => neckLeft + (boundary(fret) - start) * scale;
  const fretWidth = (fret) => fret === 0 ? OPEN_WIDTH : (boundary(fret) - boundary(fret - 1)) * scale;
  const openX = minFret === 0 ? LABEL_WIDTH + OPEN_WIDTH / 2 : null;
  const fretCenter = (fret) => fret === 0 ? openX : (fretBoundary(fret - 1) + fretBoundary(fret)) / 2;
  const neckRight = maxFret === 0 ? neckLeft + 20 : fretBoundary(maxFret);
  const stringY = (stringIndex) => FIRST_STRING_Y + strings.findIndex(({ index }) => index === stringIndex) * STRING_GAP;
  return {
    width: Math.ceil(neckRight + RIGHT_PADDING),
    height: FIRST_STRING_Y + Math.max(0, strings.length - 1) * STRING_GAP + 49,
    neckLeft, neckRight, openX, fretCenter, fretBoundary, fretWidth, stringY, visibleFrets,
  };
}

function svgElement(document, tag, attributes = {}, text) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  if (text !== undefined) element.textContent = text;
  return element;
}

export function createFretboard(container, { onSelect = () => {} } = {}) {
  const document = container.ownerDocument ?? globalThis.document;
  const id = `fretboard-${++nextId}`;
  const viewport = document.createElement("div");
  viewport.className = "fb-viewport";
  viewport.setAttribute("role", "group");
  const neck = document.createElement("div");
  neck.className = "fb-neck";
  const drawing = svgElement(document, "svg", { class: "fb-drawing", "aria-hidden": "true", focusable: "false" });
  const labelLayer = document.createElement("div");
  labelLayer.className = "fb-labels";
  labelLayer.setAttribute("aria-hidden", "true");
  const positionLayer = document.createElement("div");
  positionLayer.className = "fb-positions";
  const connectionText = document.createElement("div");
  connectionText.className = "fb-connection-text";
  neck.append(drawing, labelLayer, positionLayer);
  viewport.append(neck);
  container.replaceChildren(viewport, connectionText);
  container.classList.add("fretboard-ui");

  const buttons = new Map();
  let model;
  let geometry;
  let destroyed = false;

  function navigate(event) {
    const origin = event.currentTarget;
    const position = { stringIndex: Number(origin.dataset.stringIndex), fret: Number(origin.dataset.fret) };
    const row = model.strings.findIndex(({ index }) => index === position.stringIndex);
    const enabled = model.positions.filter((item) => item.selectable === true && !item.states?.includes("disabled"));
    let candidates;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const direction = event.key === "ArrowLeft" ? -1 : 1;
      candidates = enabled.filter((item) => item.stringIndex === position.stringIndex && Math.sign(item.fret - position.fret) === direction)
        .sort((a, b) => Math.abs(a.fret - position.fret) - Math.abs(b.fret - position.fret));
    } else if (event.key === "Home" || event.key === "End") {
      candidates = enabled.filter((item) => item.stringIndex === position.stringIndex)
        .sort((a, b) => event.key === "Home" ? a.fret - b.fret : b.fret - a.fret);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const direction = event.key === "ArrowUp" ? -1 : 1;
      const rows = model.strings.map(({ index }, order) => ({ index, order }))
        .filter(({ order }) => Math.sign(order - row) === direction)
        .sort((a, b) => Math.abs(a.order - row) - Math.abs(b.order - row));
      for (const targetRow of rows) {
        candidates = enabled.filter((item) => item.stringIndex === targetRow.index)
          .sort((a, b) => Math.abs(a.fret - position.fret) - Math.abs(b.fret - position.fret) || a.fret - b.fret);
        if (candidates.length) break;
      }
    } else return;
    event.preventDefault();
    if (candidates?.length) focusPosition(candidates[0]);
  }

  function drawNeck() {
    const { width, height, neckLeft, neckRight } = geometry;
    drawing.setAttribute("viewBox", `0 0 ${width} ${height}`);
    drawing.setAttribute("width", width);
    drawing.setAttribute("height", height);
    drawing.replaceChildren();
    labelLayer.replaceChildren();
    const top = FIRST_STRING_Y - 27;
    const bottom = geometry.stringY(model.strings.at(-1).index) + 27;
    drawing.append(svgElement(document, "rect", { x: neckLeft, y: top, width: Math.max(20, neckRight - neckLeft), height: bottom - top, class: "fb-neck-face", rx: 4 }));
    if (model.fretRange.minFret === 0) {
      drawing.append(svgElement(document, "rect", { x: LABEL_WIDTH, y: top, width: OPEN_WIDTH, height: bottom - top, class: "fb-open-lane" }));
      drawing.append(svgElement(document, "line", { x1: neckLeft, x2: neckLeft, y1: top, y2: bottom, class: "fb-nut" }));
    } else {
      drawing.append(svgElement(document, "line", { x1: neckLeft, x2: neckLeft, y1: top, y2: bottom, class: "fb-cropped-edge" }));
    }
    const active = new Set(model.activeStringIndices ?? model.strings.map(({ index }) => index));
    for (const [order, string] of model.strings.entries()) {
      const y = geometry.stringY(string.index);
      if (active.has(string.index)) drawing.append(svgElement(document, "rect", { x: LABEL_WIDTH, y: y - 25, width: neckRight - LABEL_WIDTH, height: 50, class: "fb-active-lane" }));
      drawing.append(svgElement(document, "line", {
        x1: LABEL_WIDTH, x2: neckRight, y1: y, y2: y,
        class: `fb-string${active.has(string.index) ? " is-active" : " is-ghost"}`,
        "data-string-index": string.index, "stroke-width": 1 + order * .34,
      }));
      const label = document.createElement("div");
      label.className = `fb-string-label${active.has(string.index) ? " is-active" : ""}`;
      label.style.top = `${y}px`;
      label.textContent = string.label;
      labelLayer.append(label);
    }
    for (const fret of geometry.visibleFrets) {
      if (fret > 0) drawing.append(svgElement(document, "line", { x1: geometry.fretBoundary(fret), x2: geometry.fretBoundary(fret), y1: top, y2: bottom, class: "fb-fret" }));
      drawing.append(svgElement(document, "text", { x: geometry.fretCenter(fret), y: 23, class: "fb-fret-number", "text-anchor": "middle" }, fret === 0 ? "OPEN" : String(fret)));
      const marker = fret % 12;
      if (fret > 0 && [0, 3, 5, 7, 9].includes(marker)) {
        for (const offset of marker === 0 ? [-6, 6] : [0]) drawing.append(svgElement(document, "circle", {
          cx: geometry.fretCenter(fret) + offset, cy: bottom + 14, r: 3.4, class: "fb-position-marker", "data-fret": fret,
        }));
      }
    }
  }

  function drawConnections(positions) {
    connectionText.replaceChildren();
    const defs = svgElement(document, "defs");
    const marker = svgElement(document, "marker", { id: `${id}-arrow`, markerWidth: 7, markerHeight: 7, refX: 6, refY: 3.5, orient: "auto", markerUnits: "userSpaceOnUse" });
    marker.append(svgElement(document, "path", { d: "M 0 0 L 7 3.5 L 0 7 Z", class: "fb-arrowhead" }));
    defs.append(marker);
    drawing.append(defs);
    const connections = (model.connections ?? []).filter((connection) => positions.has(keyOf(connection.from)) && positions.has(keyOf(connection.to)));
    const rowKey = ({ from, to }) => `${Math.min(from.stringIndex, to.stringIndex)}:${Math.max(from.stringIndex, to.stringIndex)}`;
    const rowCounts = new Map();
    const rowSlots = new Map();
    for (const connection of connections) rowCounts.set(rowKey(connection), (rowCounts.get(rowKey(connection)) ?? 0) + 1);
    for (const [connectionIndex, connection] of connections.entries()) {
      const groupKey = rowKey(connection);
      const slot = rowSlots.get(groupKey) ?? 0;
      rowSlots.set(groupKey, slot + 1);
      const crowded = rowCounts.get(groupKey) > 1;
      const x1 = geometry.fretCenter(connection.from.fret);
      const x2 = geometry.fretCenter(connection.to.fret);
      const y1 = geometry.stringY(connection.from.stringIndex);
      const y2 = geometry.stringY(connection.to.stringIndex);
      const stationary = connection.kind === "stationary" || (x1 === x2 && y1 === y2);
      const group = svgElement(document, "g", { class: `fb-connection${connection.emphasis ? " is-emphasized" : ""}`, "data-kind": stationary ? "stationary" : connection.kind });
      if (stationary) {
        group.append(svgElement(document, "circle", { cx: x1, cy: y1, r: 27 + slot * 3, class: "fb-stationary" }));
      } else {
        const lift = 29 + slot * 6;
        group.append(svgElement(document, "path", {
          d: `M ${x1} ${y1 - 28} C ${x1} ${y1 - lift - 12}, ${x2} ${y2 - lift - 12}, ${x2} ${y2 - 29}`,
          class: "fb-movement", "marker-end": `url(#${id}-arrow)`,
        }));
      }
      if (connection.label) {
        if (crowded) {
          const number = connectionIndex + 1;
          const x = (x1 + x2) / 2 + (slot - (rowCounts.get(groupKey) - 1) / 2) * 18;
          const y = Math.min(y1, y2) - 36;
          group.append(svgElement(document, "circle", { cx: x, cy: y - 4, r: 8, class: "fb-path-badge" }));
          group.append(svgElement(document, "text", { x, y, "text-anchor": "middle", class: "fb-path-number" }, String(number)));
          const legend = document.createElement("span");
          legend.className = "fb-connection-legend";
          legend.textContent = `${number}. ${connection.label}`;
          connectionText.append(legend);
        } else {
          group.append(svgElement(document, "text", { x: (x1 + x2) / 2, y: Math.min(y1, y2) - 37, "text-anchor": "middle", class: "fb-movement-label" }, connection.label));
        }
        const text = document.createElement("span");
        if (!crowded) {
          text.className = "fb-sr-only";
          text.textContent = connection.label;
          connectionText.append(text);
        }
      }
      drawing.append(group);
    }
  }

  function update(nextModel) {
    if (destroyed) throw new Error("Cannot update a destroyed fretboard.");
    if (!nextModel.strings?.length) throw new TypeError("Fretboard strings must be supplied in display order.");
    model = nextModel;
    geometry = fretboardGeometry(model);
    viewport.setAttribute("aria-label", model.label ?? "Guitar fretboard. Arrow keys move between available positions.");
    neck.style.width = `${geometry.width}px`;
    neck.style.height = `${geometry.height}px`;
    drawNeck();

    const visibleStrings = new Set(model.strings.map(({ index }) => index));
    const positions = new Map(model.positions.filter(({ stringIndex, fret }) => visibleStrings.has(stringIndex)
      && Number.isInteger(fret) && fret >= model.fretRange.minFret && fret <= model.fretRange.maxFret).map((position) => [keyOf(position), position]));
    drawConnections(positions);
    for (const [key, element] of buttons) {
      if (!positions.has(key)) { element.remove(); buttons.delete(key); }
    }
    const order = new Map(model.strings.map(({ index }, indexInView) => [index, indexInView]));
    const ordered = [...positions.values()].sort((a, b) => order.get(a.stringIndex) - order.get(b.stringIndex) || a.fret - b.fret);
    for (const position of ordered) {
      const key = keyOf(position);
      let button = buttons.get(key);
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.dataset.stringIndex = String(position.stringIndex);
        button.dataset.fret = String(position.fret);
        button.addEventListener("click", () => {
          const current = model.positions.find((item) => keyOf(item) === key);
          if (current?.selectable === true && !current.states?.includes("disabled")) onSelect({ stringIndex: current.stringIndex, fret: current.fret });
        });
        button.addEventListener("keydown", navigate);
        buttons.set(key, button);
        positionLayer.append(button);
      }
      const states = (position.states ?? []).filter((state) => STATES.has(state));
      const selected = position.selected === true || states.includes("selected");
      const selectable = position.selectable === true && !states.includes("disabled");
      button.disabled = !selectable;
      button.className = ["fb-position", selectable ? "is-selectable" : "is-display", ...states.map((state) => `is-${state}`), selected ? "is-selected" : ""].filter(Boolean).join(" ");
      button.setAttribute("aria-pressed", String(selected));
      const string = model.strings.find(({ index }) => index === position.stringIndex);
      button.setAttribute("aria-label", position.ariaLabel ?? `${string.label}, fret ${position.fret}${position.primaryLabel ? `, ${position.primaryLabel}` : ""}${position.secondaryLabel ? `, ${position.secondaryLabel}` : ""}${selected ? ", selected" : ""}`);
      button.style.left = `${geometry.fretCenter(position.fret)}px`;
      button.style.top = `${geometry.stringY(position.stringIndex)}px`;
      button.replaceChildren();
      const marker = document.createElement("span");
      marker.className = "fb-note-marker";
      marker.setAttribute("aria-hidden", "true");
      const primary = document.createElement("span");
      primary.className = "fb-primary-label";
      primary.textContent = position.primaryLabel ?? (selected ? "●" : "");
      marker.append(primary);
      if (position.secondaryLabel) {
        const secondary = document.createElement("span");
        secondary.className = "fb-secondary-label";
        secondary.textContent = position.secondaryLabel;
        marker.append(secondary);
      }
      button.append(marker);
    }
    // A changed window may add positions between existing nodes. Reorder only
    // when needed, restoring focus after DOM moves; ordinary selection updates
    // leave the native button itself in place.
    const nodes = ordered.map((position) => buttons.get(keyOf(position)));
    if (nodes.some((node, index) => positionLayer.children[index] !== node)) {
      const focused = document.activeElement;
      positionLayer.replaceChildren(...nodes);
      if (nodes.includes(focused) && !focused.disabled) focused.focus({ preventScroll: true });
    }
  }

  function focusPosition(position) {
    const button = buttons.get(keyOf(position));
    if (!button || button.disabled) return false;
    button.focus({ preventScroll: true });
    button.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    return true;
  }

  function destroy() {
    container.replaceChildren();
    buttons.clear();
    destroyed = true;
  }
  return { update, focusPosition, destroy };
}
