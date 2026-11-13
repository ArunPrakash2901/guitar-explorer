import { COLOR_GROUPS, COLOR_IDS } from "./progression/chord-colors.js?ge-revision=00581e04556260884131d3feca93b1898bb0b741";

export function connectChordColors(onApply) {
  const trigger = document.querySelector("#chord-color");
  const dialog = document.querySelector("#chord-color-dialog");
  const body = dialog.querySelector(".color-body");
  const groups = document.querySelector("#color-groups");
  const familyPicker = document.querySelector("#color-families");
  const familyList = document.querySelector("#color-family-list");
  const count = document.querySelector("#color-count");
  const summary = document.querySelector("#color-summary");
  const more = document.querySelector("#color-more");
  const views = [...dialog.querySelectorAll("[data-color-view]")];
  let selected = [];
  let activeFamily = COLOR_GROUPS[0].name;

  const families = COLOR_GROUPS.map(({ name, chords }, index) => {
    const family = document.createElement("button");
    family.type = "button";
    family.append(name);
    const tally = document.createElement("small");
    family.append(tally);
    familyList.append(family);

    const group = document.createElement("section");
    group.id = "color-group-" + index;
    family.setAttribute("aria-controls", group.id);
    const header = document.createElement("div");
    header.className = "color-group-heading";
    const heading = document.createElement("h3");
    heading.id = group.id + "-name";
    heading.textContent = name;
    group.setAttribute("aria-labelledby", heading.id);
    const groupAction = document.createElement("button");
    groupAction.type = "button";
    groupAction.className = "color-group-action";
    groupAction.textContent = "Select group";
    groupAction.hidden = true;
    header.append(heading, groupAction);
    group.append(header);
    const items = document.createElement("div");
    items.className = "color-items";
    const toggles = chords.map(({ id, displayName, symbol }) => {
      const label = document.createElement("label");
      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.setAttribute("role", "switch");
      toggle.setAttribute("aria-label", symbol + ": " + displayName);
      toggle.value = id;
      const text = document.createElement("span");
      text.className = "color-type";
      text.textContent = symbol;
      const caption = document.createElement("small");
      caption.textContent = displayName;
      label.append(toggle, text, caption);
      items.append(label);
      return toggle;
    });
    group.append(items);
    groups.append(group);

    family.addEventListener("click", () => {
      activeFamily = name;
      showView("card");
    });
    groupAction.addEventListener("click", () => {
      const select = toggles.some(({ checked }) => !checked);
      for (const toggle of toggles) toggle.checked = select;
      updateCount();
    });
    return { name, family, tally, group, groupAction, toggles };
  });
  const toggles = families.flatMap((family) => family.toggles);
  const symbols = new Map(COLOR_GROUPS.flatMap(({ chords }) => chords.map(({ id, symbol }) => [id, symbol])));

  function showView(view) {
    const cardView = view === "card";
    dialog.dataset.view = view;
    familyPicker.hidden = !cardView;
    for (const button of views) button.setAttribute("aria-pressed", String(button.dataset.colorView === view));
    for (const { name, family, group, groupAction } of families) {
      family.setAttribute("aria-pressed", String(name === activeFamily));
      group.hidden = cardView && name !== activeFamily;
      groupAction.hidden = !cardView;
    }
    body.scrollTop = 0;
  }

  function checkedColors() {
    return toggles.filter(({ checked }) => checked).map(({ value }) => value);
  }

  function updateCount() {
    let total = 0;
    for (const { tally, groupAction, toggles } of families) {
      const checked = toggles.filter((toggle) => toggle.checked).length;
      total += checked;
      tally.textContent = checked + "/" + toggles.length;
      groupAction.textContent = checked === toggles.length ? "Clear group" : "Select group";
    }
    count.textContent = total ? total + (total === 1 ? " color selected" : " colors selected") : "Major and minor chords only.";
  }

  function checkColors(ids) {
    for (const toggle of toggles) toggle.checked = ids.includes(toggle.value);
    updateCount();
  }

  function set(ids) {
    selected = COLOR_IDS.filter((id) => ids.includes(id));
    const labels = selected.map((id) => symbols.get(id));
    summary.textContent = labels.length ? labels.slice(0, 3).join(", ") : "Basic only";
    more.textContent = labels.length > 3 ? "+" + (labels.length - 3) : "";
    more.hidden = labels.length <= 3;
    trigger.title = labels.length ? labels.join(", ") : "Major and minor chords only";
  }

  trigger.addEventListener("click", () => {
    checkColors(selected);
    dialog.showModal();
    body.scrollTop = 0;
  });
  for (const button of views) button.addEventListener("click", () => showView(button.dataset.colorView));
  groups.addEventListener("change", updateCount);
  document.querySelector("#color-all").addEventListener("click", () => checkColors(COLOR_IDS));
  document.querySelector("#color-clear").addEventListener("click", () => checkColors([]));
  document.querySelector("#color-close").addEventListener("click", () => dialog.close());
  document.querySelector("#color-cancel").addEventListener("click", () => dialog.close());
  document.querySelector("#color-apply").addEventListener("click", () => {
    set(checkedColors());
    dialog.close();
    onApply();
  });
  dialog.addEventListener("close", () => trigger.focus({ preventScroll: true }));
  showView("compact");
  set([]);
  return { get value() { return [...selected]; }, set };
}
