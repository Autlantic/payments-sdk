import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 4180);

const CHECKS = [
  {
    id: "api",
    name: "Billing API",
    url: "https://billing.autlantic.com/healthz",
    expectJsonOk: true,
  },
  {
    id: "portal",
    name: "Merchant portal",
    url: "https://portal.autlantic.com/",
    expectJsonOk: false,
  },
  {
    id: "docs",
    name: "Docs",
    url: "https://docs.autlantic.com/",
    expectJsonOk: false,
  },
];

async function probe(check) {
  const started = Date.now();
  try {
    const res = await fetch(check.url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
      headers: { accept: "application/json, text/html, */*" },
    });
    const ms = Date.now() - started;
    if (!res.ok) {
      return {
        id: check.id,
        name: check.name,
        url: check.url,
        ok: false,
        status: res.status,
        ms,
        detail: `HTTP ${res.status}`,
      };
    }
    if (check.expectJsonOk) {
      const body = await res.json().catch(() => null);
      const ok = Boolean(body && body.ok === true);
      return {
        id: check.id,
        name: check.name,
        url: check.url,
        ok,
        status: res.status,
        ms,
        detail: ok ? `ok · ${ms} ms` : `unexpected body · ${ms} ms`,
      };
    }
    return {
      id: check.id,
      name: check.name,
      url: check.url,
      ok: true,
      status: res.status,
      ms,
      detail: `HTTP ${res.status} · ${ms} ms`,
    };
  } catch (err) {
    return {
      id: check.id,
      name: check.name,
      url: check.url,
      ok: false,
      status: 0,
      ms: Date.now() - started,
      detail: err instanceof Error ? err.message : "request failed",
    };
  }
}

async function statusPayload() {
  const checks = [];
  for (const check of CHECKS) {
    checks.push(await probe(check));
  }
  const allOk = checks.every((c) => c.ok);
  const anyOk = checks.some((c) => c.ok);
  return {
    ok: allOk,
    state: allOk ? "operational" : anyOk ? "partial" : "major",
    checkedAt: new Date().toISOString(),
    checks,
  };
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  });
  res.end(payload);
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && (url.pathname === "/api/status" || url.pathname === "/healthz")) {
    const payload = await statusPayload();
    if (url.pathname === "/healthz") {
      sendJson(res, payload.ok ? 200 : 503, { ok: payload.ok, state: payload.state });
      return;
    }
    sendJson(res, 200, payload);
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405).end();
    return;
  }

  const rel = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(publicDir, rel));
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
      return;
    }
    res.writeHead(200, {
      "content-type": contentType(filePath),
      "cache-control": rel === "/index.html" ? "no-store" : "public, max-age=300",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`status listening on ${port}`);
});
