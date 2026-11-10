import assert from "node:assert/strict";
import { once } from "node:events";
import { createLabServer } from "./serve-lab.mjs";

const server = createLabServer();
server.listen(0, "127.0.0.1");
try {
  await once(server, "listening");
  const origin = "http://127.0.0.1:" + server.address().port;
  const request = (path) => fetch(origin + path, { signal: AbortSignal.timeout(5000) });

  const home = await request("/");
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-type"), /^text\/html\b/);
  const html = await home.text();
  assert.match(html, /<h1>Guitar Explorer<\/h1>/);
  assert.match(html, /<h2>Music Engine<\/h2>/);
  assert.match(html, /Song Study is being designed\./);
  assert.doesNotMatch(html, /<(?:button|form|script)\b/i);

  const index = await request("/index.html");
  assert.equal(index.status, 200);
  assert.equal(await index.text(), html);

  const engine = await request("/engine/index.js");
  assert.equal(engine.status, 200);
  assert.match(engine.headers.get("content-type"), /^text\/javascript\b/);
  assert.match(await engine.text(), /export \* from "\.\/query\/index\.js";/);

  for (const page of [
    "accompaniment", "chord-lab", "harmony", "instrument-desk", "melody",
    "motif", "practice", "product-spine", "role-lens", "voice-leading",
  ]) {
    for (const suffix of ["", ".html"]) {
      const path = "/" + page + suffix;
      const response = await request(path);
      assert.equal(response.status, 404, path);
      await response.text();
    }
  }

  for (const path of [
    "/engine/missing.js", "/engine/%2e%2e%2fpackage.json", "/src/engine/index.ts",
    "/lab/index.html", "/instrument-desk-app.js", "/session-evidence.mjs", "/samples/steel/LICENSE",
  ]) {
    const response = await request(path);
    assert.equal(response.status, 404, path);
    await response.text();
  }
} finally {
  server.close();
  await once(server, "close");
}

console.log("local entrypoint, engine module and retired route checks passed");
