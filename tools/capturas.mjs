// Vuelve a hacer las capturas de assets/capturas/ a partir de la aplicación (Edge sin cabeza, perfil limpio, datos inventados
// y la hora movida a un lunes por la mañana). Uso: sirve la carpeta «out» de Nexo (npm run build) en el puerto 4173 y ejecuta
//   node tools/capturas.mjs
// Después convierte los PNG a WebP: node tools/a-webp.py (necesita Pillow). Variables: NEXO_URL, EDGE.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SALIDA = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", "capturas");
fs.mkdirSync(SALIDA, { recursive: true });
const PERFIL = path.join(process.env.TEMP, "nexo-web-perfil");
fs.rmSync(PERFIL, { recursive: true, force: true });

const edge = spawn(process.env.EDGE ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", [
  "--headless=new", "--remote-debugging-port=9445", `--user-data-dir=${PERFIL}`, "--window-size=1280,800",
  "--hide-scrollbars", "--force-device-scale-factor=1.35", "--no-first-run", "--disable-gpu", "about:blank",
], { stdio: "ignore" });

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let t;
for (let i = 0; i < 40; i++) { try { t = await (await fetch("http://127.0.0.1:9445/json")).json(); if (t[0]) break; } catch {} await esperar(500); }
const ws = new WebSocket(t.find((x) => x.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const p = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && p.has(m.id)) { p.get(m.id)(m.result); p.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; p.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1.35, mobile: false });
const base = process.env.NEXO_URL ?? "http://127.0.0.1:4173";

// El próximo lunes a las 7:15 (hora local): así «Tu día» tiene clase por venir.
const objetivo = new Date();
objetivo.setDate(objetivo.getDate() + ((8 - objetivo.getDay()) % 7 || 7));
objetivo.setHours(7, 15, 0, 0);
const desfase = objetivo.getTime() - Date.now();
await send("Page.addScriptToEvaluateOnNewDocument", {
  source: `(() => { const R = Date, d = ${desfase}; class F extends R { constructor(...a) { if (a.length === 0) super(R.now() + d); else super(...a); } static now() { return R.now() + d; } } window.Date = F; })();`,
});

const dia = (n) => { const d = new Date(objetivo); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const clases = [
  ["Cálculo diferencial", "MAT-1010", "Dra. Ríos", "A-12", 0, "08:00", "09:40", "#4f8cff"],
  ["Programación", "SIS-1021", "Mtro. Vega", "Lab 3", 0, "10:00", "11:40", "#2ec4a6"],
  ["Física", "FIS-1005", "Dr. Salas", "B-04", 1, "08:00", "09:40", "#f0812a"],
  ["Inglés técnico", "ING-1002", "Mtra. Cruz", "C-21", 1, "12:00", "13:40", "#a26bff"],
  ["Cálculo diferencial", "MAT-1010", "Dra. Ríos", "A-12", 2, "08:00", "09:40", "#4f8cff"],
  ["Programación", "SIS-1021", "Mtro. Vega", "Lab 3", 2, "10:00", "11:40", "#2ec4a6"],
  ["Física", "FIS-1005", "Dr. Salas", "B-04", 3, "08:00", "09:40", "#f0812a"],
  ["Química", "QUI-1003", "Dra. Pardo", "B-09", 4, "10:00", "11:40", "#e5509f"],
].map((c, i) => ({ id: `c${i}`, materia: c[0], codigo: c[1], docente: c[2], aula: c[3], dia: c[4], inicio: c[5], fin: c[6], color: c[7] }));
const eventos = [
  ["Entregar la tarea de cálculo", "tarea", dia(1), "23:59", "#f0812a"],
  ["Examen de física", "examen", dia(3), "08:00", "#e5484d"],
  ["Proyecto de programación", "tarea", dia(5), null, "#f0812a"],
  ["Asesoría con la Mtra. Cruz", "cita", dia(2), "16:00", "#3b82f6"],
  ["Pagar la inscripción", "recordatorio", dia(12), null, "#a26bff"],
].map((e, i) => ({ id: `e${i}`, titulo: e[0], categoria: e[1], fecha: e[2], hora: e[3], color: e[4], nota: "", avisar: false, repetir: "no" }));
const notas = [
  { id: "n1", texto: "Comprar la calculadora científica", hecha: false },
  { id: "n2", texto: "Leer el capítulo 4 de física", hecha: false },
  { id: "n3", texto: "Imprimir el reporte de laboratorio", hecha: false },
];

const guias = ["bienvenida", "video", "musica", "documentos", "herramienta", "carpetas", "calendario", "horario", "calculadora", "configuracion", "atajos"];
const sembrar = (tema, idioma) => `
  localStorage.setItem("nexushub-guias-vistas", ${JSON.stringify(JSON.stringify(guias))});
  localStorage.setItem("nexushub-tour-visto", "1");
  localStorage.setItem("nexushub-version-vista", "9.9.9");
  localStorage.setItem("nexushub-horario", ${JSON.stringify(JSON.stringify(clases))});
  localStorage.setItem("nexushub-eventos", ${JSON.stringify(JSON.stringify(eventos))});
  localStorage.setItem("nexushub-notas", ${JSON.stringify(JSON.stringify(notas))});
  localStorage.setItem("nexushub-perfil", ${JSON.stringify(JSON.stringify({ nombre: "Ana" }))});
  localStorage.setItem("nexushub-primeros-pasos", ${JSON.stringify(JSON.stringify({ buscador: true, carpetas: true, descartado: true, completado: true }))});
  localStorage.setItem("nexushub-consejos-vistos", ${JSON.stringify(JSON.stringify(["clase", "evento", "carpeta"]))});
  { const a = JSON.parse(localStorage.getItem("nexushub-ajustes") ?? "{}"); a.tema = "${tema}"; a.idioma = "${idioma}"; localStorage.setItem("nexushub-ajustes", JSON.stringify(a)); localStorage.setItem("nexushub-idioma", "${idioma}"); }
`;

async function foto(nombre) {
  const s = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(SALIDA, nombre + ".png"), Buffer.from(s.data, "base64"));
  console.log("ok", nombre);
}
async function ir(ruta, nombre, espera = 2500, antes) {
  await send("Page.navigate", { url: base + ruta });
  await esperar(espera);
  if (antes) { await antes(); await esperar(900); }
  await foto(nombre);
}
async function tecla(key, code, modifiers = 0, vk) {
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code, modifiers, windowsVirtualKeyCode: vk });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, modifiers, windowsVirtualKeyCode: vk });
}
async function buscar(texto) {
  await tecla("k", "KeyK", 2, 75); // Ctrl + K
  await esperar(700);
  await send("Input.insertText", { text: texto });
}

await send("Page.navigate", { url: base + "/inicio" });
await esperar(2500);
await ev(sembrar("oscuro", "es"));

await ir("/inicio", "inicio");
await ir("/horario", "horario");
await ir("/calendario", "calendario");
await ir("/documentos", "documentos");
await ir("/documentos/dividir-pdf", "dividir-pdf");
await ir("/calculadora", "calculadora");
await ir("/configuracion", "configuracion", 2500, async () => { await ev(`document.querySelector('[data-ajuste-ahorro], h2')?.scrollIntoView()`); });
await ir("/inicio", "buscador", 2500, async () => { await buscar("fisica"); await esperar(800); });
await ir("/inicio", "buscador-examen", 2500, async () => { await buscar("tarea"); await esperar(800); });

// Inglés
await ev(sembrar("oscuro", "en"));
await ir("/inicio", "ingles-inicio");
await ir("/documentos", "ingles-documentos");

// Tema claro
await ev(sembrar("claro", "es"));
await ir("/inicio", "inicio-claro");
await ir("/horario", "horario-claro");

ws.close();
spawnSync("taskkill", ["/PID", String(edge.pid), "/T", "/F"]);
process.exit(0);
