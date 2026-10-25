import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const labRoot = resolve(projectRoot, "lab");
const engineRoot = resolve(projectRoot, ".lab-dist", "engine");
const outputRoot = resolve(projectRoot, ".preview-dist");
const revision = process.env.GE_REVISION || process.env.GITHUB_SHA || "local";
const previewPr = process.env.GE_PREVIEW_PR || "";

const textExtensions = new Set([".html", ".js", ".mjs", ".css"]);
const requiredPaths = [
  "index.html",
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

function applyPreviewCompatibility(filename, source) {
  if (filename !== "practice-app.js") return source;
  return source.replace(
    "const focused = /^\\/harmony(?:\\.html)?\\/?$/.test(location.pathname);",
    "const focused = /(?:^|\\/)harmony(?:\\.html)?\\/?$/.test(location.pathname);",
  );
}

function injectPreviewShell(source) {
  let transformed = source;
  if (transformed.includes("</head>")) {
    const metadata = [
      `  <meta name="guitar-explorer-revision" content="${htmlEscape(revision)}">`,
      `  <meta name="guitar-explorer-preview-pr" content="${htmlEscape(previewPr)}">`,
    ].join("\n");
    transformed = transformed.replace("</head>", `${metadata}\n</head>`);
  }
  if (transformed.includes("</body>") && !transformed.includes("session-evidence.mjs")) {
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
await cp(engineRoot, join(outputRoot, "engine"), { recursive: true });

// The local server aliases /harmony.html to practice.html. Static previews need an
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
  if (extension === ".html") transformed = injectPreviewShell(transformed);
  transformed = rewriteRootReferences(transformed);
  transformed = applyPreviewCompatibility(filename, transformed);
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

console.log(`Preview build ready: ${relative(projectRoot, outputRoot)}`);
console.log(`Revision: ${revision}`);
if (previewPr) console.log(`PR: ${previewPr}`);
