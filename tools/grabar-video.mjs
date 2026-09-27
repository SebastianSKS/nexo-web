// Graba el video de presentación de Nexo con la demo (datos inventados): Edge sin cabeza + capturas de pantalla continuas + ffmpeg.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.DEMO_URL ?? "http://127.0.0.1:4190/nexo-web/demo";
const SALIDA = process.env.SALIDA ?? path.join(process.env.TEMP, "video-nexo");
const IMAGEN_HORARIO = path.join(process.env.TEMP, "horario-ejemplo.png");
fs.rmSync(SALIDA, { recursive: true, force: true });
fs.mkdirSync(path.join(SALIDA, "f"), { recursive: true });
const PERFIL = path.join(process.env.TEMP, "nexo-video-perfil" + Date.now());
const ANCHO = 1280, ALTO = 800;

const limpiarEdge = () => spawnSync("powershell", ["-NoProfile", "-Command", "Get-CimInstance Win32_Process -Filter \"Name='msedge.exe'\" | Where-Object { $_.CommandLine -match 'nexo-video-perfil' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"]);
limpiarEdge(); // un Edge de una grabación anterior seguiría escuchando en el mismo puerto y la grabación se haría sobre su estado viejo
await new Promise((r) => setTimeout(r, 1500));
const edge = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", ["--headless=new", "--remote-debugging-port=9460", `--user-data-dir=${PERFIL}`, `--window-size=${ANCHO},${ALTO}`, "--hide-scrollbars", "--no-first-run", "--disable-gpu", "about:blank"], { stdio: "ignore" });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let t; for (let i = 0; i < 40; i++) { try { t = await (await fetch("http://127.0.0.1:9460/json")).json(); if (t[0]) break; } catch {} await esperar(500); }
const ws = new WebSocket(t.find((x) => x.type === "page").webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const p = new Map();
const frames = []; // { n, ts }
let grabando = false, perdido = 0, tPausa = 0, contador = 0;
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && p.has(m.id)) { p.get(m.id)(m.result); p.delete(m.id); }
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; p.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => { const r = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }); return r.exceptionDetails ? "EXC " + (r.exceptionDetails.exception?.description ?? "") : r.result?.value; };

async function pausar() { if (!grabando) return; grabando = false; tPausa = Date.now(); }
async function seguir() { perdido += Date.now() - tPausa; grabando = true; }

// Captura continua: una foto de la pantalla tras otra (con su hora real). Las pausas no cuentan en el video.
let activo = true;
const bucle = (async () => {
  while (activo) {
    if (!grabando) { await esperar(20); continue; }
    try {
      const s = await send("Page.captureScreenshot", { format: "jpeg", quality: 85 });
      if (!grabando || !s?.data) continue;
      const n = ++contador;
      fs.writeFileSync(path.join(SALIDA, "f", `${String(n).padStart(6, "0")}.jpg`), Buffer.from(s.data, "base64"));
      frames.push({ n, ts: Date.now() - perdido });
    } catch { await esperar(50); }
  }
})();

// ——— Preparación ———
await send("Page.enable"); await send("DOM.enable");
await send("Emulation.setDeviceMetricsOverride", { width: ANCHO, height: ALTO, deviceScaleFactor: 1, mobile: false });
// Un lunes a las 7:15: «Tu día» tiene una clase en 45 minutos.
const objetivo = new Date(); objetivo.setDate(objetivo.getDate() + ((8 - objetivo.getDay()) % 7 || 7)); objetivo.setHours(7, 15, 0, 0);
const desfase = objetivo.getTime() - Date.now();
const CURSOR = `
(() => {
  const R = Date, d = ${desfase}; class F extends R { constructor(...a) { if (a.length === 0) super(R.now() + d); else super(...a); } static now() { return R.now() + d; } } window.Date = F;
  const montar = () => {
    if (document.getElementById("__cur")) return;
    const st = document.createElement("style");
    st.textContent = '[role=note]{display:none!important}#__cur{position:fixed;left:0;top:0;z-index:99999;pointer-events:none;width:26px;height:26px;transition:transform .7s cubic-bezier(.4,0,.2,1);filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}#__cap{position:fixed;left:50%;bottom:34px;transform:translateX(-50%);z-index:99998;pointer-events:none;max-width:78%;padding:12px 22px;border-radius:6px;background:rgba(22,24,29,.92);color:#f5f2ea;font:600 22px/1.35 "Segoe UI",system-ui,sans-serif;text-align:center;opacity:0;transition:opacity .35s}#__cap.v{opacity:1}#__ond{position:fixed;z-index:99997;pointer-events:none;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:3px solid #f2a20c;opacity:0}#__ond.a{animation:__o .5s ease-out}@keyframes __o{from{opacity:1;transform:scale(.6)}to{opacity:0;transform:scale(3)}}';
    document.head.appendChild(st);
    const c = document.createElement("div"); c.id = "__cur"; c.style.transform = "translate(-60px,-60px)";
    c.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l16 9-7 2-3 7z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.append(c);
    const cap = document.createElement("div"); cap.id = "__cap"; document.body.append(cap);
    const o = document.createElement("div"); o.id = "__ond"; document.body.append(o);
  };
  document.addEventListener("DOMContentLoaded", montar); setInterval(montar, 300);
  window.__mover = (x, y) => { montar(); document.getElementById("__cur").style.transform = "translate(" + x + "px," + y + "px)"; };
  window.__clic = (x, y) => { const o = document.getElementById("__ond"); o.style.left = x + "px"; o.style.top = y + "px"; o.classList.remove("a"); void o.offsetWidth; o.classList.add("a"); };
  window.__cap = (txt) => { montar(); const c = document.getElementById("__cap"); if (!txt) { c.classList.remove("v"); return; } c.classList.remove("v"); setTimeout(() => { c.textContent = txt; c.classList.add("v"); }, 200); };
  window.__centro = (buscar) => { const e = buscar(); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; };
})();`;
await send("Page.addScriptToEvaluateOnNewDocument", { source: CURSOR });

async function ir(ruta) {
  await send("Page.navigate", { url: BASE + ruta }); await esperar(3500);
}
async function cap(txt) { await ev(`__cap(${JSON.stringify(txt)})`); }
async function clicEn(buscarJS, { escribe } = {}) {
  const c = await ev(`__centro(() => (${buscarJS}))`);
  if (!c) throw new Error("no encuentro: " + buscarJS);
  await ev(`__mover(${c.x - 4}, ${c.y - 4})`); await esperar(750);
  await ev(`__clic(${c.x}, ${c.y})`); await esperar(150);
  await ev(`(${buscarJS}).click()`); await esperar(350);
}
const boton = (texto) => `[...document.querySelectorAll('button')].find(b => /${texto}/.test(b.textContent))`;
const navItem = (texto) => `[...document.querySelectorAll('nav *')].find(e => e.children.length === 0 && e.textContent.trim() === '${texto}')`;
async function tecla(key, code, vk, mods = 0) {
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code, modifiers: mods, windowsVirtualKeyCode: vk });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, modifiers: mods, windowsVirtualKeyCode: vk });
}

// Primera carga (sin grabar): tema claro y datos de ejemplo
await ir("/inicio/");
await ev(`{ const a = JSON.parse(localStorage.getItem("nexushub-ajustes") ?? "{}"); a.tema = "claro"; localStorage.setItem("nexushub-ajustes", JSON.stringify(a)); localStorage.setItem("nexushub-primeros-pasos", JSON.stringify({ buscador: true, carpetas: true, descartado: true, completado: true })); }`);
await ir("/inicio/");

// ——— Escena 1: Tu día ———
await seguir();
await cap("Al abrir Nexo, tu día de un vistazo");
await esperar(2800);
const dia = await ev(`__centro(() => [...document.querySelectorAll('h2,h3')].find(h => /Tu día/.test(h.textContent)))`);
if (dia) { await ev(`__mover(${dia.x + 260}, ${dia.y + 60})`); }
await esperar(700);
await cap("Qué sigue, qué entregas y qué te falta por hacer");
await esperar(3200);

// ——— Escena 2: escanear el horario ———
await cap("");
await clicEn(navItem("Horario"));
await esperar(1200);
await pausar();
await ev(`localStorage.removeItem("nexushub-horario")`);
await ir("/horario/");
await seguir();
await cap("Empieza con una foto del horario que te dieron");
await esperar(2400);
await clicEn(boton("Escanear imagen"));
await esperar(900);
await cap("Nexo lo lee: materias, días y horas");
const doc = await send("DOM.getDocument", { depth: -1 });
const inp = await send("DOM.querySelector", { nodeId: doc.root.nodeId, selector: "input[type=file]" });
await send("DOM.setFileInputFiles", { files: [IMAGEN_HORARIO], nodeId: inp.nodeId });
for (let i = 0; i < 40; i++) { await esperar(500); if (await ev(`/Encontré \\d+ clases/.test(document.body.innerText)`)) break; }
await esperar(2600);
await cap("Revisas, guardas y listo");
await clicEn(boton("Guardar horario"));
await esperar(900);
await cap("Antes de cada clase, Nexo te avisa");
await esperar(3000);

// ——— Escena 3: búsqueda ———
await cap("");
await tecla("k", "KeyK", 75, 2);
await esperar(600);
await cap("Ctrl + K: busca clases, eventos y notas");
for (const ch of "fisica") { await send("Input.insertText", { text: ch }); await esperar(170); }
await esperar(2200);
await cap("En la app de Windows también busca dentro de tus PDF, Word, Excel y PowerPoint");
await esperar(3200);
await tecla("Escape", "Escape", 27);
await esperar(600);

// ——— Escena 4: calendario ———
await cap("");
await clicEn(navItem("Calendario"));
await esperar(1000);
await cap("Exámenes, tareas y citas, cada uno con su aviso");
await esperar(3000);

// ——— Escena 5: documentos ———
await cap("");
await clicEn(navItem("Documentos"));
await esperar(1000);
await cap("17 herramientas para tus PDF y archivos de Office. Nada se sube a internet");
await esperar(3200);

// ——— Cierre ———
await cap("");
await ev(`(() => { const e = document.createElement("div"); e.id = "__fin"; e.style.cssText = "position:fixed;inset:0;z-index:100000;background:#f5f2ea;color:#16181d;display:grid;place-content:center;text-align:center;gap:14px;font-family:Georgia,serif;opacity:0;transition:opacity .6s"; e.innerHTML = '<div style="font:700 22px Segoe UI,sans-serif;letter-spacing:.14em;color:#5a5e67">NEXO</div><div style="font-size:64px;font-weight:700;line-height:1.05">Tu carrera,<br><i style=\\'color:#1b4fd8;font-weight:400\\'>en un solo lugar.</i></div><div style="font:500 22px Segoe UI,sans-serif;color:#5a5e67;margin-top:10px">Gratis por ahora · Windows 10 y 11</div><div style="font:600 24px Segoe UI,sans-serif;margin-top:6px">sebastiansks.github.io/nexo-web</div>'; document.body.append(e); requestAnimationFrame(() => e.style.opacity = 1); })()`);
await esperar(3000);
await pausar();
activo = false; await bucle;
ws.close(); limpiarEdge();

// ——— Armado del video ———
frames.sort((a, b) => a.ts - b.ts);
const lista = [];
for (let i = 0; i < frames.length; i++) {
  const dur = i + 1 < frames.length ? Math.max(0.01, (frames[i + 1].ts - frames[i].ts) / 1000) : 1.0;
  lista.push(`file 'f/${String(frames[i].n).padStart(6, "0")}.jpg'`, `duration ${dur.toFixed(4)}`);
}
lista.push(`file 'f/${String(frames.at(-1).n).padStart(6, "0")}.jpg'`);
fs.writeFileSync(path.join(SALIDA, "lista.txt"), lista.join("\n"));
const total = (frames.at(-1).ts - frames[0].ts) / 1000;
console.log(`fotogramas: ${frames.length} · duración: ${total.toFixed(1)} s`);
const r = spawnSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", "lista.txt", "-vf", `fps=30,scale=${ANCHO}:${ALTO},format=yuv420p`, "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-movflags", "+faststart", "-an", "nexo-demo.mp4"], { cwd: SALIDA, encoding: "utf8" });
console.log(r.status === 0 ? "mp4 listo" : r.stderr.slice(-600));
console.log("tamaño MB:", (fs.statSync(path.join(SALIDA, "nexo-demo.mp4")).size / 1048576).toFixed(2));
process.exit(0);
