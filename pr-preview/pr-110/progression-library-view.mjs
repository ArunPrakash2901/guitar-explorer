import {
  decodeProgression, deleteFavorite, describeProgression, encodeProgression,
  FAVORITES_KEY, MAX_COLLECTION_NAME, MAX_FAVORITE_NAME, progressionText,
  readFavorites, restoreProgression, saveFavorite, SHARE_PREFIX, updateFavorite,
} from "./progression-library.mjs?ge-revision=36e2f7a567c56233f0af60303756f40c6342e069";
import { downloadProgressionImage } from "./progression-image.mjs?ge-revision=36e2f7a567c56233f0af60303756f40c6342e069";

function actionButton(text, label, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = text;
  if (label) button.setAttribute("aria-label", label);
  button.addEventListener("click", action);
  return button;
}

function labelInput(label, name, value, maxLength) {
  const wrapper = document.createElement("label");
  wrapper.textContent = label;
  const input = document.createElement("input");
  input.name = name;
  input.value = value;
  input.maxLength = maxLength;
  wrapper.append(input);
  return wrapper;
}

export function connectProgressionLibrary({ capture, restore }) {
  const library = document.querySelector("#progression-library");
  const drawer = document.querySelector("#library-drawer");
  const status = document.querySelector("#library-status");
  const list = document.querySelector("#favorites");
  const empty = document.querySelector("#favorites-empty");
  const fallback = document.querySelector("#copy-fallback");
  const quickFavorite = document.querySelector("#quick-favorite");
  const filter = document.querySelector("#favorite-collection");
  let entries = [];
  let editing = null;

  document.querySelector('nav a[href="#progression-library"]')?.addEventListener("click", () => { drawer.open = true; });

  function updateQuickFavorite() {
    let saved = false;
    try {
      const { snapshot } = capture();
      const token = encodeProgression(snapshot);
      saved = entries.some((entry) => entry.token === token);
    } catch { /* A progression may not be generated yet. */ }
    quickFavorite.textContent = saved ? "★" : "☆";
    quickFavorite.setAttribute("aria-pressed", String(saved));
    quickFavorite.setAttribute("aria-label", saved ? "Remove current progression from favorites" : "Save current progression to favorites");
    quickFavorite.title = saved ? "Remove favorite" : "Save favorite";
  }

  function focusEdit(token) {
    const item = [...list.children].find((child) => child.dataset.token === token);
    (item?.querySelector("[data-edit-favorite]") ?? filter).focus();
  }

  function editForm(entry) {
    const form = document.createElement("form");
    form.className = "favorite-edit";
    form.setAttribute("aria-label", "Edit favorite");
    const name = labelInput("Favorite name", "name", entry.name, MAX_FAVORITE_NAME);
    const collection = labelInput("Collection", "collection", entry.collection, MAX_COLLECTION_NAME);
    const save = document.createElement("button");
    save.type = "submit";
    save.textContent = "Save details";
    function cancel() {
      editing = null;
      renderFavorites();
      focusEdit(entry.token);
    }
    form.append(name, collection, save, actionButton("Cancel", null, cancel));
    form.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      cancel();
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      try {
        const fields = new FormData(form);
        updateFavorite(localStorage, entry.token, { name: fields.get("name"), collection: fields.get("collection") });
        editing = null;
        refreshFavorites();
        focusEdit(entry.token);
        status.textContent = "Favorite details saved.";
      } catch (problem) {
        status.textContent = problem.message;
      }
    });
    return form;
  }

  function renderFavorites() {
    const selected = filter.value;
    const collections = [...new Set(entries.map(({ collection }) => collection).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    filter.replaceChildren(new Option("All collections", ""), new Option("Unfiled", "unfiled"),
      ...collections.map((name) => new Option(name, "collection:" + name)));
    filter.value = [...filter.options].some(({ value }) => value === selected) ? selected : "";
    filter.parentElement.hidden = collections.length === 0;
    const visible = entries.filter(({ collection }) => !filter.value ||
      (collection ? "collection:" + collection : "unfiled") === filter.value);
    list.replaceChildren();
    empty.hidden = visible.length > 0;
    empty.textContent = entries.length ? "No favorites in this collection." : "No favorites saved on this device.";
    for (const entry of visible) {
      const { token, snapshot, name, collection } = entry;
      const item = document.createElement("li");
      item.dataset.token = token;
      const info = document.createElement("div");
      info.className = "favorite-info";
      const label = document.createElement("strong");
      label.textContent = name || describeProgression(snapshot);
      const detail = document.createElement("small");
      detail.textContent = [name ? describeProgression(snapshot) : "", collection].filter(Boolean).join(" · ");
      info.append(label, detail);
      const actions = document.createElement("div");
      actions.className = "favorite-actions";
      actions.append(actionButton("Restore", "Restore " + label.textContent, () => {
        try {
          restore(restoreProgression(snapshot), { focus: true });
          status.textContent = "Favorite restored.";
        } catch (problem) {
          status.textContent = problem.message;
        }
      }));
      const edit = actionButton("Edit", "Edit " + label.textContent, () => {
        editing = token;
        renderFavorites();
        list.querySelector(".favorite-edit input")?.focus();
      });
      edit.dataset.editFavorite = "";
      actions.append(edit, actionButton("Delete", "Delete " + label.textContent, () => {
        try {
          deleteFavorite(localStorage, token);
          if (editing === token) editing = null;
          refreshFavorites();
          document.querySelector("#save-favorite").focus();
          status.textContent = "Favorite deleted.";
        } catch (problem) {
          status.textContent = problem.message;
        }
      }));
      item.append(info, actions);
      if (editing === token) item.append(editForm(entry));
      list.append(item);
    }
  }

  function refreshFavorites() {
    try {
      entries = readFavorites(localStorage);
    } catch {
      entries = [];
      status.textContent = "Favorites are unavailable in this browser.";
    }
    renderFavorites();
    updateQuickFavorite();
  }

  filter.addEventListener("change", () => {
    editing = null;
    renderFavorites();
  });
  quickFavorite.addEventListener("click", () => {
    try {
      const { snapshot } = capture();
      const token = encodeProgression(snapshot);
      const alreadySaved = readFavorites(localStorage).some((entry) => entry.token === token);
      if (alreadySaved) deleteFavorite(localStorage, token);
      else saveFavorite(localStorage, token);
      refreshFavorites();
      status.textContent = alreadySaved ? "Removed this progression from favorites." : "Favorite saved on this device.";
    } catch (problem) {
      status.textContent = problem.message;
    }
  });
  window.addEventListener("progression-changed", updateQuickFavorite);

  async function copy(value, what) {
    try {
      await navigator.clipboard.writeText(value);
      fallback.hidden = true;
      status.textContent = what + " copied.";
    } catch {
      fallback.value = value;
      fallback.hidden = false;
      fallback.focus();
      fallback.select();
      status.textContent = "Use your browser’s Copy command to copy the selected " + what.toLowerCase() + ".";
    }
  }

  library.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-library]");
    if (!button) return;
    try {
      const { workspace, snapshot } = capture();
      switch (button.dataset.library) {
        case "save":
          saveFavorite(localStorage, encodeProgression(snapshot));
          refreshFavorites();
          status.textContent = "Favorite saved on this device.";
          break;
        case "text":
          await copy(progressionText(workspace, snapshot.p), "Progression text");
          break;
        case "link": {
          const link = new URL(location.href);
          link.hash = SHARE_PREFIX + encodeProgression(snapshot);
          await copy(link.href, "Share link");
          break;
        }
        case "image":
          button.disabled = true;
          try {
            await downloadProgressionImage(workspace, snapshot);
            status.textContent = "Progression PNG exported.";
          } finally {
            button.disabled = false;
          }
          break;
      }
    } catch (problem) {
      status.textContent = problem.message;
    }
  });

  function restoreHash() {
    if (!location.hash.startsWith(SHARE_PREFIX)) return false;
    try {
      const saved = restoreProgression(decodeProgression(location.hash.slice(SHARE_PREFIX.length)));
      restore(saved, { focus: false });
      status.textContent = "Shared progression restored.";
      return true;
    } catch (problem) {
      status.textContent = problem.message;
      return false;
    }
  }
  window.addEventListener("hashchange", restoreHash);
  window.addEventListener("storage", ({ key }) => {
    if (key === null || key === FAVORITES_KEY) refreshFavorites();
  });
  refreshFavorites();
  return restoreHash();
}
