import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const read = async (path) => readFile(resolve(path), "utf8");
const root = JSON.parse(await read("package.json"));
const win = JSON.parse(await read("packaging/windows/package.json"));
const android = JSON.parse(await read("packaging/android/capacitor.config.json"));
const mobile = JSON.parse(await read("packaging/android/package.json"));
const workflow = await read(".github/workflows/build-personal-installers.yml");

assert.equal(root.scripts["app:build"], "npm run lab:build && node scripts/build-preview.mjs --channel stable --app-home");
assert.equal(win.build.win.target[0].target, "nsis");
assert.deepEqual(win.build.win.target[0].arch, ["x64"]);
assert.equal(win.build.win.icon, "icon.ico");
assert.ok(win.build.files.includes("site/**/*"));
assert.equal(android.appName, "Guitar Explorer");
assert.equal(android.webDir, "../../.preview-dist");
assert.ok(mobile.dependencies["@capacitor/android"].startsWith("8."));
assert.match(workflow, /windows-latest/);
assert.match(workflow, /ubuntu-latest/);
assert.match(workflow, /assembleDebug/);
assert.match(workflow, /gh release create/);
assert.match(workflow, /release-assets\/\*\.exe/);
assert.match(workflow, /release-assets\/\*\.apk/);
const icon = await readFile(resolve("packaging/windows/icon.ico"));
assert.equal(icon.readUInt16LE(0), 0);
assert.equal(icon.readUInt16LE(2), 1);
assert.equal(icon.readUInt16LE(4), 1);
assert.ok((await stat("packaging/windows/main.cjs")).size > 500);
for (const name of ["packaging/windows/main.cjs", "scripts/prepare-windows-installer.mjs"]) {
  const syntax = spawnSync(process.execPath, ["--check", name], { encoding: "utf8" });
  assert.equal(syntax.status, 0, `${name}: ${syntax.stderr}`);
}
console.log("Native installer scaffolding checks passed; binary build and real-device tests still required.");
