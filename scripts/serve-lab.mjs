import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const labRoot = resolve(projectRoot, "lab");
const engineRoot = resolve(projectRoot, ".lab-dist", "engine");
const port = Number.parseInt(process.env.PORT ?? "4173", 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
]);

function inside(base, candidate) {
  return candidate === base || candidate.startsWith(`${base}${sep}`);
}

function resolveRequest(pathname) {
  if (pathname === "/" || pathname === "/index.html") {
    return resolve(labRoot, "index.html");
  }
  if (pathname === "/app.js") {
    return resolve(labRoot, "app.js");
  }
  if (pathname.startsWith("/engine/")) {
    const candidate = resolve(engineRoot, pathname.slice("/engine/".length));
    return inside(engineRoot, candidate) ? candidate : null;
  }
  return null;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/favicon.ico") {
      response.writeHead(204);
      response.end();
      return;
    }

    const filename = resolveRequest(decodeURIComponent(url.pathname));
    if (!filename) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const body = await readFile(filename);
    response.writeHead(200, {
      "content-type": contentTypes.get(extname(filename)) ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(body);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(error instanceof Error ? error.message : "Unexpected server error");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Guitar Explorer Lab is running at http://127.0.0.1:${port}`);
  console.log("Press Ctrl+C to stop.");
});
