import { COLOR_GROUPS, COLOR_IDS } from "./progression/chord-colors.js?ge-revision=49dc7b3c771c023cbc4f8427bb431de7e2d4dcc8";

export function connectChordColors(onApply) {
  const trigger = document.querySelector("#chord-color");
  const dialog = document.querySelector("#chord-color-dialog");
  const groups = document.querySelector("#color-groups");
  const count = document.querySelector("#color-count");
  const summary = document.querySelector("#color-summary");
  let selected = [];

  for (const { name, chords } of COLOR_GROUPS) {
    const group = document.createElement("fieldset");
    const title = document.createElement("legend");
    title.textContent = name;
    group.append(title);
    for (const { id, displayName, symbol } of chords) {
      const label = document.createElement("label");
      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.value = id;
      toggle.name = "extra-color";
      const caption = document.createElement("span");
      caption.textContent = displayName;
      label.append(toggle, caption);
      if (symbol) {
        const notation = document.createElement("small");
        notation.textContent = symbol;
        notation.setAttribute("aria-hidden", "true");
        label.append(notation);
      }
      group.append(label);
    }
    groups.append(group);
  }
  const toggles = [...groups.querySelectorAll("input")];
  function checkedColors() {
    return toggles.filter(({ checked }) => checked).map(({ value }) => value);
  }
  function updateCount() {
    count.textContent = checkedColors().length + " of " + COLOR_IDS.length + " selected";
  }
  function checkColors(ids) {
    for (const toggle of toggles) toggle.checked = ids.includes(toggle.value);
    updateCount();
  }
  function set(ids) {
    selected = [...ids];
    summary.textContent = !selected.length ? "Major and minor" : selected.length === 1 ? "1 extra type" : selected.length + " extra types";
  }
  trigger.addEventListener("click", () => {
    checkColors(selected);
    dialog.showModal();
  });
  groups.addEventListener("change", updateCount);
  document.querySelector("#color-all").addEventListener("click", () => checkColors(COLOR_IDS));
  document.querySelector("#color-clear").addEventListener("click", () => checkColors([]));
  document.querySelector("#color-cancel").addEventListener("click", () => dialog.close());
  document.querySelector("#color-apply").addEventListener("click", () => {
    set(checkedColors());
    dialog.close();
    onApply();
  });
  dialog.addEventListener("close", () => trigger.focus({ preventScroll: true }));
  set([]);
  return { get value() { return [...selected]; }, set };
}
