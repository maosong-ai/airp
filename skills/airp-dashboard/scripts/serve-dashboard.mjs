import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openUrl } from "./open-url.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function guessContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".ico") return "image/x-icon";
  return "application/octet-stream";
}

function safeJoin(rootDir, urlPath) {
  const cleaned = urlPath.split("?")[0].split("#")[0];
  const rel = decodeURIComponent(cleaned).replace(/^\/+/, "");
  const joined = path.join(rootDir, rel);
  const resolved = path.resolve(joined);
  const rootResolved = path.resolve(rootDir);
  if (!resolved.startsWith(rootResolved + path.sep) && resolved !== rootResolved) {
    return null;
  }
  return resolved;
}

async function fileExists(p) {
  try {
    const s = await stat(p);
    return s.isFile();
  } catch {
    return false;
  }
}

async function main() {
  const distDir = path.resolve(__dirname, "..", "renderer-dist");
  try {
    const s = await stat(path.join(distDir, "index.html"));
    if (!s.isFile()) throw new Error("index.html missing");
  } catch {
    throw new Error(
      `Dashboard assets not found at ${distDir}. ` +
        `Run packaging to vendor renderer dist into this skill (skills/airp-dashboard/renderer-dist).`
    );
  }

  const server = createServer(async (req, res) => {
    try {
      const reqUrl = req.url ?? "/";
      let target = safeJoin(distDir, reqUrl);
      if (!target) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      if (reqUrl === "/" || reqUrl === "/index.html") {
        target = path.join(distDir, "index.html");
      } else if (!(await fileExists(target))) {
        const maybeIndex = path.join(distDir, "index.html");
        if (await fileExists(maybeIndex)) target = maybeIndex;
      }

      if (!(await fileExists(target))) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const body = await readFile(target);
      res.setHeader("Content-Type", guessContentType(target));
      res.setHeader("Cache-Control", "no-cache");
      res.writeHead(200);
      res.end(body);
    } catch (err) {
      res.writeHead(500);
      res.end(err instanceof Error ? err.message : "Server error");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("Failed to resolve server address");

  const url = `http://127.0.0.1:${addr.port}/`;
  console.log(url);
  try {
    openUrl(url);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});

