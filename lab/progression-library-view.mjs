import {
  decodeProgression, deleteFavorite, describeProgression, encodeProgression,
  FAVORITES_KEY, progressionText, readFavorites, restoreProgression, saveFavorite, SHARE_PREFIX,
} from "./progression-library.mjs";

export function connectProgressionLibrary({ capture, restore }) {
  const library = document.querySelector("#progression-library");
  const status = document.querySelector("#library-status");
  const list = document.querySelector("#favorites");
  const fallback = document.querySelector("#copy-fallback");
  const quickFavorite = document.querySelector("#quick-favorite");
  function updateQuickFavorite(entries) {
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

  function refreshFavorites() {
    list.replaceChildren();
    let entries;
    try { entries = readFavorites(localStorage); }
    catch {
      status.textContent = "Favorites are unavailable in this browser.";
      return;
    }
    document.querySelector("#favorites-empty").hidden = entries.length > 0;
    updateQuickFavorite(entries);
    for (const { token, snapshot } of entries) {
      const item = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = describeProgression(snapshot);
      const actions = document.createElement("div");
      for (const action of ["Restore", "Delete"]) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = action;
        button.setAttribute("aria-label", action + " " + name.textContent);
        button.addEventListener("click", () => {
          try {
            if (action === "Restore") {
              restore(restoreProgression(snapshot), { focus: true });
              status.textContent = "Favorite restored.";
            } else {
              deleteFavorite(localStorage, token);
              refreshFavorites();
              document.querySelector("#save-favorite").focus();
              status.textContent = "Favorite deleted.";
            }
          } catch (problem) {
            status.textContent = problem.message;
          }
        });
        actions.append(button);
      }
      item.append(name, actions);
      list.append(item);
    }
  }

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
  window.addEventListener("progression-changed", refreshFavorites);

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
    const action = event.target.closest("button[data-library]")?.dataset.library;
    if (!action) return;
    try {
      const { workspace, snapshot } = capture();
      if (action === "save") {
        saveFavorite(localStorage, encodeProgression(snapshot));
        refreshFavorites();
        status.textContent = "Favorite saved on this device.";
      } else if (action === "text") {
        await copy(progressionText(workspace, snapshot.p), "Progression text");
      } else if (action === "link") {
        const link = new URL(location.href);
        link.hash = SHARE_PREFIX + encodeProgression(snapshot);
        await copy(link.href, "Share link");
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
