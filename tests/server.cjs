const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".ttf": "font/ttf",
  ".json": "application/json",
  ".txt": "text/plain",
};
let workerRevision = null,
  failAsset = false,
  networkUnavailable = false;
const server = http.createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/__test/network") {
    let input = "";
    for await (const part of request) input += part;
    networkUnavailable = JSON.parse(input).unavailable === true;
    response.writeHead(200);
    response.end("OK");
    return;
  }
  if (request.method === "POST" && request.url === "/__test/worker-revision") {
    let input = "";
    for await (const part of request) input += part;
    const settings = JSON.parse(input);
    workerRevision = settings.version || null;
    failAsset = settings.failAsset === true;
    response.writeHead(200);
    response.end("OK");
    return;
  }
  let pathname = decodeURIComponent(
    new URL(request.url, "http://localhost").pathname,
  );
  if (networkUnavailable) {
    response.destroy();
    return;
  }
  if (pathname === "/tgsalor") {
    response.writeHead(301, { Location: "/tgsalor/" });
    response.end();
    return;
  }
  if (pathname.startsWith("/tgsalor/")) pathname = pathname.slice(8);
  if (pathname === "/") pathname = "/index.html";
  const file = path.resolve(root, "." + pathname);
  if (!file.startsWith(root + path.sep)) {
    response.writeHead(403);
    response.end();
    return;
  }
  try {
    if (failAsset && pathname === "/vendor/html2canvas/html2canvas.min.js") {
      response.writeHead(503);
      response.end("Simulated cache download failure");
      return;
    }
    let data = await fs.readFile(file);
    if (workerRevision && pathname === "/sw.js") {
      data = Buffer.from(
        data
          .toString()
          .replace(
            /const VERSION = "[^"]+";/,
            "const VERSION = " + JSON.stringify(workerRevision) + ";",
          ),
      );
    }
    response.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(data);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});
server.listen(4173, "127.0.0.1", () =>
  console.log("Static test site: http://127.0.0.1:4173/tgsalor/"),
);
