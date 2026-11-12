const root = document.documentElement;

function themeButton(id) {
  return document.getElementById(id);
}

function setTheme(theme, { persist = true } = {}) {
  const next = theme === "dark" ? "dark" : "light";
  root.dataset.theme = next;
  themeButton("theme-light")?.setAttribute("aria-pressed", String(next === "light"));
  themeButton("theme-dark")?.setAttribute("aria-pressed", String(next === "dark"));
  if (persist) {
    try { localStorage.setItem("guitar-explorer-theme", next); } catch { /* appearance preference only */ }
  }
}

let initialTheme = "light";
try {
  const saved = localStorage.getItem("guitar-explorer-theme");
  if (saved === "light" || saved === "dark") initialTheme = saved;
  else if (globalThis.matchMedia?.("(prefers-color-scheme: dark)")?.matches) initialTheme = "dark";
} catch { /* use light */ }

setTheme(initialTheme, { persist: false });
themeButton("theme-light")?.addEventListener("click", () => setTheme("light"));
themeButton("theme-dark")?.addEventListener("click", () => setTheme("dark"));
