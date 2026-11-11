import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const labRoot = resolve(projectRoot, "lab");
const buildRoot = resolve(projectRoot, ".lab-dist");
const browserAssets = new Set(["index.html", "song-study.css", "song-study.mjs", "song-view.mjs", "song-audio.mjs"]);

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
]);

function resolveRequest(pathname) {
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  if (browserAssets.has(relativePath)) return resolve(labRoot, relativePath);
  if (/^\/(?:engine|song-study)\/(?:[\w-]+\/)*[\w-]+\.js(?:\.map)?$/.test(pathname)) {
    return resolve(buildRoot, relativePath);
  }
  return null;
}

export function createLabServer() {
  return createServer(async (request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
    } catch {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      response.end("Invalid URL");
      return;
    }

    if (pathname === "/favicon.ico") {
      response.writeHead(204);
      response.end();
      return;
    }

    const filename = resolveRequest(pathname);
    try {
      if (filename) {
        const body = await readFile(filename);
        response.writeHead(200, {
          "content-type": contentTypes.get(extname(filename)),
          "cache-control": "no-store",
        });
        response.end(body);
        return;
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        response.end("Could not read build output");
        return;
      }
    }

    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  });
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? "4173");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  createLabServer().listen(port, "127.0.0.1", () => {
    console.log("Guitar Explorer is running at http://127.0.0.1:" + port);
    console.log("Press Ctrl+C to stop.");
  });
}
