// Local UI preview with an in-memory PostgREST substitute. Never uses account
// credentials or the production database. The actual Next.js API runs unchanged.
const http = require("node:http");
const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.RACKO_PREVIEW_PORT || 3107);
const databasePort = port + 10;
const rows = new Map();
let child;

function json(response, status, value) {
  response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(value));
}

const database = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://127.0.0.1:${databasePort}`);
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const body = raw ? JSON.parse(raw) : null;
    if (url.pathname.startsWith("/realtime/")) return json(response, 200, {});
    if (url.pathname === "/rest/v1/leaderboard") return json(response, 200, []);
    if (url.pathname.startsWith("/rest/v1/rpc/")) return json(response, 200, null);
    if (url.pathname !== "/rest/v1/games") return json(response, 404, { message: "Unknown local test endpoint" });
    const single = String(request.headers.accept).includes("vnd.pgrst.object");
    const code = url.searchParams.get("code")?.replace(/^eq\./, "");
    const version = url.searchParams.get("version")?.replace(/^eq\./, "");
    const matches = [...rows.values()].filter((row) => (!code || row.code === code) && (!version || row.version === Number(version)));
    if (request.method === "POST") {
      if (rows.has(body.code)) return json(response, 409, { code: "23505", message: "duplicate code" });
      const now = new Date().toISOString();
      rows.set(body.code, { ...body, version: 1, created_at: now, updated_at: now, last_active_at: now });
      response.writeHead(201); return response.end();
    }
    if (request.method === "PATCH") {
      for (const row of matches) rows.set(row.code, { ...row, ...body });
      if (!String(request.headers.prefer).includes("return=representation")) { response.writeHead(204); return response.end(); }
      if (single && matches.length !== 1) return json(response, 406, { code: "PGRST116", message: "row not found or version conflict" });
      return json(response, 200, single ? rows.get(matches[0].code) : matches.map((row) => rows.get(row.code)));
    }
    if (request.method === "DELETE") {
      for (const row of matches) rows.delete(row.code);
      response.writeHead(204); return response.end();
    }
    if (single && matches.length !== 1) return json(response, 406, { code: "PGRST116", message: "row not found" });
    return json(response, 200, single ? matches[0] : matches);
  } catch (error) { json(response, 500, { message: error.message }); }
});
database.on("upgrade", (_request, socket) => socket.destroy());
database.listen(databasePort, "127.0.0.1", () => {
  console.log(`Lokale Bot-Vorschau: http://127.0.0.1:${port} (Testdaten nur im Arbeitsspeicher)`);
  child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: root, stdio: "inherit", windowsHide: true,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${databasePort}`,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_preview_only",
      SUPABASE_SERVICE_ROLE_KEY: "local-preview-only",
    },
  });
  child.on("error", (error) => { console.error(error.message); process.exitCode = 1; database.close(); });
  child.on("exit", (code) => { process.exitCode = code || 0; database.close(); });
});
function stop() { child?.kill(); database.close(); }
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
