import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const labRoot = resolve(projectRoot, "lab");
const sourceRoot = resolve(projectRoot, "src");
const buildRoot = resolve(projectRoot, ".lab-dist");
const outputRoot = resolve(projectRoot, ".preview-dist");

const revision = process.env.GE_REVISION || process.env.GITHUB_SHA || "local";
const previewPr = process.env.GE_PREVIEW_PR || "";
const channelFlagIndex = process.argv.indexOf("--channel");
const deploymentChannel = process.argv.find((arg) => arg.startsWith("--channel="))?.split("=", 2)[1]
  || (channelFlagIndex >= 0 ? process.argv[channelFlagIndex + 1] : null)
  || process.env.GE_DEPLOYMENT_CHANNEL
  || "preview";
if (!["stable", "preview", "experimental"].includes(deploymentChannel)) {
  throw new Error(`Unknown deployment channel: ${deploymentChannel}`);
}
const deploymentLabel = process.env.GE_DEPLOYMENT_LABEL
  || (deploymentChannel === "preview" && previewPr ? `pr-${previewPr}` : `local-${deploymentChannel}`);
const revisionQuery = "?ge-revision=" + encodeURIComponent(revision);

function htmlEscape(value) {
  return value.replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function addRevision(_, prefix, path, quote) {
  return prefix + path + revisionQuery + quote;
}

function stampImports(source) {
  return source.replace(
    /(\b(?:from\s+|import\s*(?:\(\s*)?)['"])(\.{1,2}\/[^'"?#]+\.m?js)(['"])/g,
    addRevision,
  );
}

const entry = await readFile(join(labRoot, "index.html"), "utf8");
if (!entry.includes("</head>") || /\b(?:src|href)=['"]\/(?!\/)/.test(entry)) {
  throw new Error("The preview entry must have a head and use subpath-safe local references");
}

const metadata = [
  ["revision", revision],
  ["preview-pr", previewPr],
  ["deployment-channel", deploymentChannel],
  ["deployment-label", deploymentLabel],
].map(([name, value]) => `  <meta name="guitar-explorer-${name}" content="${htmlEscape(value)}">`).join("\n");

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
const stampedEntry = entry
  .replace(/(\b(?:src|href)=['"])(\.{1,2}\/[^'"?#]+\.(?:css|mjs))(['"])/g, addRevision)
  .replace("</head>", () => `${metadata}\n</head>`);
await writeFile(join(outputRoot, "index.html"), stampedEntry);
await writeFile(join(outputRoot, ".nojekyll"), "");

for (const asset of ["song-study.css", "song-study.mjs", "song-view.mjs", "song-audio.mjs"]) {
  const contents = await readFile(join(labRoot, asset), "utf8");
  await writeFile(join(outputRoot, asset), asset.endsWith(".mjs") ? stampImports(contents) : contents);
}

// Derive the module allowlist from current sources so stale compiler output and
// source maps stay out of the deployment.
for (const moduleRoot of ["engine", "song-study"]) {
  const files = await readdir(join(sourceRoot, moduleRoot), { recursive: true, withFileTypes: true });
  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith(".ts") || file.name.endsWith(".d.ts")) continue;
    const modulePath = relative(sourceRoot, join(file.parentPath, file.name)).replace(/\.ts$/, ".js");
    const compiled = await readFile(join(buildRoot, modulePath), "utf8");
    const stamped = stampImports(compiled).replace(/\n?\/\/# sourceMappingURL=.*$/gm, "");
    const destination = join(outputRoot, modulePath);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, stamped);
  }
}

console.log(`Static Guitar Explorer build ready: ${relative(projectRoot, outputRoot)}`);
console.log(`Channel: ${deploymentChannel}`);
console.log(`Label: ${deploymentLabel}`);
console.log(`Revision: ${revision}`);
if (previewPr) console.log(`PR: ${previewPr}`);
