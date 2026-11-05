// Rehace assets/og.png (la imagen que se ve al compartir el enlace) a partir de tools/og.html y de la captura de Inicio en tema claro.
// Uso: node tools/og.mjs   (Edge sin cabeza; variable EDGE para otra ruta). Si cambian las capturas, vuelve a correrlo.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const SALIDA = path.join(aqui, "..", "assets", "og.png");
const PAGINA = "file:///" + path.join(aqui, "og.html").replace(/\\/g, "/");
const PERFIL = path.join(process.env.TEMP ?? "/tmp", `nexo-web-og-${Date.now()}`);

const edge = spawn(process.env.EDGE ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", [
  "--headless=new", "--remote-debugging-port=9447", `--user-data-dir=${PERFIL}`, "--window-size=1200,630",
  "--hide-scrollbars", "--force-device-scale-factor=1", "--allow-file-access-from-files", "--no-first-run", "--disable-gpu", "about:blank",
], { stdio: "ignore" });

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let t;
for (let i = 0; i < 40; i++) { try { t = await (await fetch("http://127.0.0.1:9447/json")).json(); if (t[0]) break; } catch {} await esperar(500); }
const ws = new WebSocket(t.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const p = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && p.has(m.id)) { p.get(m.id)(m.result); p.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; p.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: PAGINA });
await esperar(1500);
// Con las fuentes y la imagen ya cargadas (si no, saldría con la letra de respaldo).
await send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))))", awaitPromise: true });
await esperar(400);
const s = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } });
fs.writeFileSync(SALIDA, Buffer.from(s.data, "base64"));
console.log("ok", path.relative(process.cwd(), SALIDA));
ws.close();
spawnSync("taskkill", ["/PID", String(edge.pid), "/T", "/F"]);
process.exit(0);
