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
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
]);

function inside(base, candidate) {
  return candidate === base || candidate.startsWith(`${base}${sep}`);
}

function resolveRequest(pathname) {
  if ([
    "/fretboard-view.mjs",
    "/fretboard.css",
    "/instrument-desk.css",
    "/instrument-desk-app.js",
    "/product-spine.css",
    "/session-evidence.mjs",
    "/session-evidence-core.mjs",
    "/scenario-identity.mjs",
    "/scenario-context.mjs",
  ].includes(pathname)) {
    return resolve(labRoot, pathname.slice(1));
  }
  if (pathname === "/" || pathname === "/index.html") {
    return resolve(labRoot, "instrument-desk.html");
  }
  if (["/chord-lab.html", "/chord-lab"].includes(pathname)) {
    return resolve(labRoot, "chord-lab.html");
  }
  if (pathname === "/app.js") {
    return resolve(labRoot, "app.js");
  }
  if (pathname === "/session-logic.mjs") {
    return resolve(labRoot, "session-logic.mjs");
  }
  if (["/product-spine.html", "/product-spine"].includes(pathname)) {
    return resolve(labRoot, "product-spine.html");
  }
  if (pathname === "/product-spine-app.js") {
    return resolve(labRoot, "product-spine-app.js");
  }
  if (["/practice.html", "/practice", "/harmony.html", "/harmony"].includes(pathname)) {
    return resolve(labRoot, "practice.html");
  }
  if (pathname === "/practice-app.js") {
    return resolve(labRoot, "practice-app.js");
  }
  if (pathname === "/practice-session.mjs") {
    return resolve(labRoot, "practice-session.mjs");
  }
  if (["/voice-leading.html", "/voice-leading"].includes(pathname)) {
    return resolve(labRoot, "voice-leading.html");
  }
  if (pathname === "/voice-leading-app.js") {
    return resolve(labRoot, "voice-leading-app.js");
  }
  if (pathname === "/voice-leading-session.mjs") {
    return resolve(labRoot, "voice-leading-session.mjs");
  }
  if (["/melody.html", "/melody"].includes(pathname)) return resolve(labRoot, "melody.html");
  if (["/motif.html", "/motif"].includes(pathname)) return resolve(labRoot, "motif.html");
  if (["/phrase.css", "/phrase-app.js", "/phrase-material.mjs", "/melody-session.mjs", "/motif-session.mjs", "/scenario-catalogue.mjs", "/scenario-resolver.mjs", "/rule-contract.mjs", "/melody-generator.mjs", "/melody-experience.mjs"].includes(pathname)) {
    return resolve(labRoot, pathname.slice(1));
  }
  if (pathname.startsWith("/engine/")) {
    const candidate = resolve(engineRoot, pathname.slice("/engine/".length));
    return inside(engineRoot, candidate) ? candidate : null;
  }
  return null;
}

function injectEvidenceRecorder(html) {
  if (html.includes("session-evidence.mjs") || !html.includes("</body>")) return html;
  return html.replace(
    "</body>",
    '  <script type="module" src="/session-evidence.mjs"></script>\n</body>',
  );
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

    const extension = extname(filename);
    let body = await readFile(filename);
    if (extension === ".html" && !filename.endsWith("instrument-desk.html")) {
      body = Buffer.from(injectEvidenceRecorder(body.toString("utf8")), "utf8");
    }

    response.writeHead(200, {
      "content-type": contentTypes.get(extension) ?? "application/octet-stream",
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