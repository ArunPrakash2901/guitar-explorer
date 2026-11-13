"use strict";
const { app, BrowserWindow, protocol, net, shell, session } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const fs = require("node:fs");

const SCHEME = "guitar";
protocol.registerSchemesAsPrivileged([{
  scheme: SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
}]);

const siteDir = path.join(__dirname, "site");

function resolveSitePath(request) {
  const url = new URL(request.url);
  if (url.hostname !== "app") throw new Error("Unknown application host");
  let pathname = decodeURIComponent(url.pathname);
  if (!pathname || pathname.endsWith("/")) pathname += "index.html";
  const target = path.resolve(siteDir, "." + pathname);
  if (!target.startsWith(siteDir + path.sep)) throw new Error("Invalid application path");
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) throw new Error("Missing application file");
  return target;
}

app.whenReady().then(() => {
  protocol.handle(SCHEME, (request) => {
    try { return net.fetch(pathToFileURL(resolveSitePath(request)).toString()); }
    catch { return new Response("Not found", { status: 404 }); }
  });

  session.defaultSession.setPermissionRequestHandler((_wc, _permission, reply) => reply(false));

  const window = new BrowserWindow({
    title: "Guitar Explorer",
    width: 1280,
    height: 850,
    minWidth: 760,
    minHeight: 550,
    backgroundColor: "#f2f0eb",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(SCHEME + "://app/")) event.preventDefault();
  });
  window.loadURL(SCHEME + "://app/");
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
