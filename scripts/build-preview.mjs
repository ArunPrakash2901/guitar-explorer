import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const labRoot = resolve(projectRoot, "lab");
const buildRoot = resolve(projectRoot, ".lab-dist");
const outputRoot = resolve(projectRoot, ".preview-dist");
const revision = process.env.GE_REVISION || process.env.GITHUB_SHA || "local";
const previewPr = process.env.GE_PREVIEW_PR || "";
const channelFlagIndex = process.argv.indexOf("--channel");
const requestedChannel = process.argv.find((arg) => arg.startsWith("--channel="))?.split("=", 2)[1]
  || (channelFlagIndex >= 0 ? process.argv[channelFlagIndex + 1] : null)
  || process.env.GE_DEPLOYMENT_CHANNEL
  || "preview";
const deploymentChannels = new Set(["stable", "preview", "experimental"]);
if (!deploymentChannels.has(requestedChannel)) {
  throw new Error(`Unknown deployment channel: ${requestedChannel}`);
}
const deploymentChannel = requestedChannel;
const deploymentLabel = process.env.GE_DEPLOYMENT_LABEL
  || (deploymentChannel === "preview" && previewPr ? `pr-${previewPr}` : `local-${deploymentChannel}`);

const textExtensions = new Set([".html", ".js", ".mjs", ".css"]);
const requiredPaths = [
  "index.html",
  "instrument-desk.html",
  "instrument-desk.css",
  "instrument-desk-app.js",
  "product-theme.js",
  "practice-material.mjs",
  "practice-plan.mjs",
  "role-material.mjs",
  "role-performance.mjs",
  "role-plan.mjs",
  "role-view.mjs",
  "sampled-guitar.mjs",
  "sampled-guitar-manifest.mjs",
  "samples/steel/LICENSE",
  "samples/steel/PROVENANCE.md",
  "samples/steel/PROGRESSION-PROVENANCE.md",
  "chord-lab.html",
  "product-spine.html",
  "product-spine.css",
  "product-spine-app.js",
  "product-spine-audio.js",
  "role-lens.html",
  "role-lens.css",
  "role-lens-app.js",
  "role-lens-audio.js",
  "role-lens-material.mjs",
  "accompaniment.html",
  "accompaniment.css",
  "accompaniment-app.js",
  "accompaniment-plan.mjs",
  "audio-out.mjs",
  "audio-cues.mjs",
  "practice.html",
  "harmony.html",
  "voice-leading.html",
  "melody.html",
  "motif.html",
  "session-evidence.mjs",
  "session-evidence-core.mjs",
  "scenario-identity.mjs",
  "scenario-context.mjs",
  "engine/index.js",
  "progression.html",
  "progression.css",
  "progression-workspace.mjs",
  "progression-diagram.mjs",
  "progression-audio.mjs",
  "progression-sample-bank.mjs",
  "progression-guitar-manifest.mjs",
  "progression-selection.mjs",
  "progression-fretboard.mjs",
  "progression-rhythm.mjs",
  "progression-grooves.mjs",
  "progression-drum-samples.mjs",
  "progression-library.mjs",
  "progression-library-view.mjs",
  "samples/drums/LICENSE",
  "samples/drums/PROVENANCE.md",
  "samples/drums/kick.wav",
  "samples/drums/snare.wav",
  "samples/drums/hat.wav",
  "progression/caged.js",
  "progression/generator.js",
  "progression/voicings.js",
  "progression/workspace.js",
];

function htmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function rewriteRootReferences(source) {
  return source
    .replace(/\b(src|href)=(['"])\/(?!\/)/g, "$1=$2./")
    .replace(/\bfrom\s+(['"])\/(?!\/)/g, "from $1./")
    .replace(/\bimport\s+(['"])\/(?!\/)/g, "import $1./");
}

function versionCodeReferences(source) {
  // The page's revision must identify its code too, even while Pages/browser caches
  // still hold assets from the preceding review head at the same preview URL.
  const stamp = "?ge-revision=" + encodeURIComponent(revision);
  const append = (_, prefix, path, quote) => prefix + path + stamp + quote;
  return source
    .replace(/(\b(?:src|href)=['"])(\.{1,2}\/[^'"]+\.(?:m?js|css))(['"])/g, append)
    .replace(/(\b(?:from|import)\s+['"])(\.{1,2}\/[^'"]+\.m?js)(['"])/g, append);
}

function applyPreviewCompatibility(filename, source) {
  if (filename !== "practice-app.js") return source;
  return source.replace(
    "const focused = /^\\/harmony(?:\\.html)?\\/?$/.test(location.pathname);",
    "const focused = /(?:^|\\/)harmony(?:\\.html)?\\/?$/.test(location.pathname);",
  );
}

function injectPreviewShell(filename, source) {
  let transformed = source;
  if (transformed.includes("</head>")) {
    const metadata = [
      `  <meta name="guitar-explorer-revision" content="${htmlEscape(revision)}">`,
      `  <meta name="guitar-explorer-preview-pr" content="${htmlEscape(previewPr)}">`,
      `  <meta name="guitar-explorer-deployment-channel" content="${htmlEscape(deploymentChannel)}">`,
      `  <meta name="guitar-explorer-deployment-label" content="${htmlEscape(deploymentLabel)}">`,
    ].join("\n");
    transformed = transformed.replace("</head>", `${metadata}\n</head>`);
  }
  const productShell = ["index.html", "instrument-desk.html", "progression.html"].includes(filename);
  if (transformed.includes("</body>") && !transformed.includes("session-evidence.mjs") && !productShell) {
    transformed = transformed.replace(
      "</body>",
      '  <script type="module" src="./session-evidence.mjs"></script>\n</body>',
    );
  }
  return transformed;
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

function assertSubpathSafe(filename, source) {
  const checks = [
    /\b(?:src|href)=(?:['"])\/(?!\/)/,
    /\bfrom\s+(?:['"])\/(?!\/)/,
    /\bimport\s+(?:['"])\/(?!\/)/,
  ];
  for (const pattern of checks) {
    if (pattern.test(source)) {
      throw new Error(`Preview output still contains a root-absolute local reference: ${filename}`);
    }
  }
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await cp(labRoot, outputRoot, { recursive: true });
for (const directory of ["engine", "progression"]) {
  await cp(join(buildRoot, directory), join(outputRoot, directory), { recursive: true });
}

// The review channel opens the progression workspace directly. Other channel
// builds retain the Instrument Desk entry. The source index stays the Chord Lab fixture.
const home = deploymentChannel === "preview" ? "progression.html" : "instrument-desk.html";
await cp(join(outputRoot, home), join(outputRoot, "index.html"));

// The local server aliases /harmony.html to practice.html. Static channel builds need an
// actual file while preserving the pathname distinction used by the practice app.
await cp(join(outputRoot, "practice.html"), join(outputRoot, "harmony.html"));
await writeFile(join(outputRoot, ".nojekyll"), "");

for (const file of await walk(outputRoot)) {
  const extension = extname(file);
  if (extension === ".map") {
    await rm(file);
    continue;
  }
  if (!textExtensions.has(extension)) continue;

  const original = await readFile(file, "utf8");
  const filename = relative(outputRoot, file).replaceAll("\\", "/");
  let transformed = original;
  if (extension === ".html") transformed = injectPreviewShell(filename, transformed);
  transformed = rewriteRootReferences(transformed);
  transformed = applyPreviewCompatibility(filename, transformed);
  transformed = versionCodeReferences(transformed);
  if (extension === ".js" || extension === ".mjs") {
    transformed = transformed.replace(/\n?\/\/# sourceMappingURL=.*$/gm, "");
  }
  assertSubpathSafe(filename, transformed);
  if (transformed !== original) await writeFile(file, transformed, "utf8");
}

const outputFiles = new Set((await walk(outputRoot)).map((file) => relative(outputRoot, file).replaceAll("\\", "/")));
for (const requiredPath of requiredPaths) {
  if (!outputFiles.has(requiredPath)) {
    throw new Error(`Preview build is missing required output: ${requiredPath}`);
  }
}

console.log(`Static Lab build ready: ${relative(projectRoot, outputRoot)}`);
console.log(`Channel: ${deploymentChannel}`);
console.log(`Label: ${deploymentLabel}`);
console.log(`Revision: ${revision}`);
if (previewPr) console.log(`PR: ${previewPr}`);
