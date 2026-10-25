import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildEvidenceTimeline } from "./evidence-timeline-core.mjs";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const defaultInput = resolve(projectRoot, ".evidence-local", "exports");
const defaultOutput = resolve(projectRoot, ".evidence-local", "timeline.json");

async function collectJsonFiles(target) {
  const info = await stat(target);
  if (info.isFile()) return extname(target).toLowerCase() === ".json" ? [target] : [];
  if (!info.isDirectory()) return [];

  const files = [];
  for (const entry of await readdir(target, { withFileTypes: true })) {
    const child = join(target, entry.name);
    if (entry.isDirectory()) files.push(...await collectJsonFiles(child));
    else if (entry.isFile() && extname(entry.name).toLowerCase() === ".json") files.push(child);
  }
  return files;
}

const args = process.argv.slice(2);
const stdoutOnly = args.includes("--stdout");
const targets = args.filter((arg) => arg !== "--stdout").map((arg) => resolve(projectRoot, arg));
const inputs = targets.length ? targets : [defaultInput];

const files = [];
for (const target of inputs) {
  try {
    files.push(...await collectJsonFiles(target));
  } catch (error) {
    if (targets.length || error?.code !== "ENOENT") throw error;
  }
}

const records = [];
for (const file of [...new Set(files)].sort()) {
  const evidence = JSON.parse(await readFile(file, "utf8"));
  records.push({
    evidence,
    sourceFile: relative(projectRoot, file).replaceAll("\\", "/"),
  });
}

const timeline = buildEvidenceTimeline(records);
if (stdoutOnly) {
  process.stdout.write(`${JSON.stringify(timeline, null, 2)}\n`);
} else {
  await mkdir(dirname(defaultOutput), { recursive: true });
  await writeFile(defaultOutput, `${JSON.stringify(timeline, null, 2)}\n`, "utf8");
  console.log(`Evidence timeline written: ${relative(projectRoot, defaultOutput)}`);
  console.log(`Trials: ${timeline.trialCount}`);
}
