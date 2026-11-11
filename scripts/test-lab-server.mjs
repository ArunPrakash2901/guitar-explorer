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
  assert.match(html, /<h1>Black Dog<\/h1>/);
  assert.match(html, /href=["']\.\/song-study\.css["']/);
  assert.match(html, /src=["']\.\/song-study\.mjs["']/);

  const index = await request("/index.html");
  assert.equal(index.status, 200);
  assert.equal(await index.text(), html);

  for (const [path, contentType] of [
    ["/song-study.css", /^text\/css\b/],
    ["/song-study.mjs", /^text\/javascript\b/],
    ["/song-view.mjs", /^text\/javascript\b/],
    ["/song-audio.mjs", /^text\/javascript\b/],
    ["/song-study/arrangement.js", /^text\/javascript\b/],
  ]) {
    const response = await request(path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type"), contentType, path);
    assert.ok((await response.text()).length > 0, path);
  }

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
    "/song-study/arrangement.ts", "/song-study/missing.js", "/research/types.js",
  ]) {
    const response = await request(path);
    assert.equal(response.status, 404, path);
    await response.text();
  }
} finally {
  server.close();
  await once(server, "close");
}

console.log("local Song Study, engine module and retired route checks passed");
