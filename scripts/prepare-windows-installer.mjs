import { cp, mkdir, rm, access } from "node:fs/promises";
import { resolve } from "node:path";

const from = resolve(".preview-dist");
const to = resolve("packaging/windows/site");
await access(resolve(from, "index.html"));
await rm(to, { recursive: true, force: true });
await mkdir(to, { recursive: true });
await cp(from, to, { recursive: true });
console.log("Windows app content copied into packaging/windows/site");
