/**
 * Tiny static file server for local previews and tests.
 * Serves the repository root (the parent of this folder) on port 8765.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 8765;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

http
  .createServer(function (req, res) {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    let filePath = path.join(ROOT, urlPath);

    // Directory URLs resolve to index.html, mirroring GitHub Pages.
    if (urlPath.endsWith("/")) {
      filePath = path.join(filePath, "index.html");
    }

    // Never serve anything outside the repository root.
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    fs.readFile(filePath, function (err, body) {
      if (err) {
        // GitHub Pages serves 404.html for unknown paths; do the same locally.
        fs.readFile(path.join(ROOT, "404.html"), function (e2, notFound) {
          res.writeHead(404, { "Content-Type": TYPES[".html"] });
          res.end(e2 ? "Not found" : notFound);
        });
        return;
      }
      const type = TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": type });
      res.end(body);
    });
  })
  .listen(PORT, "127.0.0.1", function () {
    console.log("Serving " + ROOT + " at http://127.0.0.1:" + PORT + "/");
  });
