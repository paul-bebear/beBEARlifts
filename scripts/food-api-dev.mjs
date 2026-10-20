// Serves the Vercel functions in api/food/ and api/ai/ on localhost, so `npm run start:offline` can proxy to them.
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const port = Number(process.env.FOOD_API_PORT || 3010);
const apiDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "api");

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

async function handle(req, res) {
  const url = new URL(req.url, `http://localhost:${port}`);
  const match = /^\/api\/(food|ai)\/([a-z]+)$/.exec(url.pathname);
  if (match == null) {
    res.writeHead(404).end();
    return;
  }
  let handlers;
  try {
    handlers = await import(pathToFileURL(path.join(apiDir, match[1], `${match[2]}.mjs`)).href);
  } catch {
    res.writeHead(404).end();
    return;
  }
  const handler = handlers[req.method];
  if (handler == null) {
    res.writeHead(405).end();
    return;
  }
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
  const response = await handler(new Request(url, { method: req.method, headers: req.headers, body }));
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

http
  .createServer((req, res) => {
    handle(req, res).catch((e) => {
      console.error(e);
      res.writeHead(500).end();
    });
  })
  .listen(port, () => console.log(`api on http://localhost:${port}/api/food/* and /api/ai/*`));
