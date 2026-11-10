import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const engineSource = resolve(projectRoot, "src", "engine");
const engineBuild = resolve(projectRoot, ".lab-dist", "engine");
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

function htmlEscape(value) {
  return value.replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const entry = await readFile(resolve(projectRoot, "lab", "index.html"), "utf8");
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
await writeFile(join(outputRoot, "index.html"), entry.replace("</head>", () => `${metadata}\n</head>`));
await writeFile(join(outputRoot, ".nojekyll"), "");

const engineFiles = await readdir(engineSource, { recursive: true, withFileTypes: true });
const revisionQuery = "?ge-revision=" + encodeURIComponent(revision);
for (const file of engineFiles) {
  if (!file.isFile() || !file.name.endsWith(".ts") || file.name.endsWith(".d.ts")) continue;
  // Derive the output allowlist from current engine sources, so stale compiler output
  // and source maps never become part of a deployment.
  const modulePath = relative(engineSource, join(file.parentPath, file.name)).replace(/\.ts$/, ".js");
  const compiled = await readFile(join(engineBuild, modulePath), "utf8");
  const stamped = compiled
    .replace(/(\b(?:from|import)\s+['"])(\.{1,2}\/[^'"]+\.js)(['"])/g,
      (_, prefix, path, quote) => prefix + path + revisionQuery + quote)
    .replace(/\n?\/\/# sourceMappingURL=.*$/gm, "");
  const destination = join(outputRoot, "engine", modulePath);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, stamped);
}

console.log(`Static Guitar Explorer build ready: ${relative(projectRoot, outputRoot)}`);
console.log(`Channel: ${deploymentChannel}`);
console.log(`Label: ${deploymentLabel}`);
console.log(`Revision: ${revision}`);
if (previewPr) console.log(`PR: ${previewPr}`);
