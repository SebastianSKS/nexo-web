// Comprueba el sitio sin instalar nada: archivos que existen, enlaces internos, textos alternativos, traducción al inglés
// y notas de quien presenta. Uso: node tools/comprobar.mjs (termina con error si algo falla).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const leer = (f) => fs.readFileSync(path.join(raiz, f), "utf8");
const html = leer("index.html");
const fallos = [];
const falla = (m) => fallos.push(m);

// 1. Archivos referenciados que existen.
const refs = [...html.matchAll(/\s(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
for (const r of new Set(refs)) {
  if (/^(https?:|mailto:|#|data:)/.test(r)) continue;
  if (!fs.existsSync(path.join(raiz, r.split("#")[0]))) falla(`No existe el archivo «${r}»`);
}
// La imagen para compartir (og:image) también tiene que existir.
for (const m of html.matchAll(/<meta[^>]*content="(assets\/[^"]+)"/g)) if (!fs.existsSync(path.join(raiz, m[1]))) falla(`No existe la imagen para compartir «${m[1]}»`);
for (const m of html.matchAll(/data-en-href="([^"]+)"/g)) if (!/^https:/.test(m[1])) falla(`Enlace en inglés que no es https: ${m[1]}`);

// 2. Enlaces a secciones de la misma página.
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
for (const m of html.matchAll(/href="#([^"]+)"/g)) if (!ids.has(m[1])) falla(`El enlace #${m[1]} no lleva a ninguna sección`);

// 3. Imágenes: texto alternativo (y su versión en inglés) y tamaño escrito (evita saltos al cargar).
for (const m of html.matchAll(/<img\b[^>]*>/g)) {
  const t = m[0];
  const alt = /\salt="([^"]*)"/.exec(t);
  const nombre = /src="([^"]+)"/.exec(t)?.[1] ?? "?";
  if (!alt) falla(`Imagen sin alt: ${nombre}`);
  else if (alt[1] && !/data-en-alt=/.test(t)) falla(`Imagen sin alt en inglés: ${nombre}`);
  if (!/\swidth="\d+"/.test(t) || !/\sheight="\d+"/.test(t)) falla(`Imagen sin width y height: ${nombre}`);
}

// 4. Todo texto de título, pregunta, pie de imagen o párrafo tiene su versión en inglés.
const soloTexto = (s) => s.replace(/<[^>]*>/g, "").replace(/&\w+;/g, " ").trim();
for (const m of html.matchAll(/<(h1|h2|h3|summary|figcaption|p)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
  const [, etiqueta, atributos, dentro] = m;
  if (!/\p{L}/u.test(soloTexto(dentro))) continue; // vacío o solo símbolos
  if (!/data-en=/.test(atributos) && !/data-en=/.test(dentro)) falla(`Sin inglés: <${etiqueta}> «${soloTexto(dentro).slice(0, 50)}»`);
}
for (const m of html.matchAll(/<(li|button)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
  const [, etiqueta, atributos, dentro] = m;
  if (etiqueta === "button" && !/data-tab=/.test(atributos)) continue;
  if (!/\p{L}/u.test(soloTexto(dentro)) || /^<svg/.test(dentro.trim())) continue;
  if (soloTexto(dentro).length <= 4) continue; // «OCR», «1»
  if (!/data-en=/.test(atributos) && !/data-en=/.test(dentro)) falla(`Sin inglés: <${etiqueta}> «${soloTexto(dentro).slice(0, 50)}»`);
}

// 5. Notas de quien presenta: una por sección, en los dos idiomas.
const secciones = [...html.matchAll(/<section class="slide[^"]*" id="([^"]+)"([^>]*)>/g)];
for (const [, id, resto] of secciones) {
  if (!/data-notas="[^"]+"/.test(resto)) falla(`La sección #${id} no tiene notas en español`);
  if (!/data-notas-en="[^"]+"/.test(resto)) falla(`La sección #${id} no tiene notas en inglés`);
}

// 5b. Las direcciones públicas coinciden en todos lados (canónica, og:url, sitemap y robots).
const canonica = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
if (!canonica) falla("Falta <link rel=\"canonical\">");
else {
  if (!html.includes(`property="og:url" content="${canonica}"`)) falla("og:url no coincide con la dirección canónica");
  if (!leer("sitemap.xml").includes(`<loc>${canonica}</loc>`)) falla("sitemap.xml no tiene la dirección canónica");
  if (!leer("robots.txt").includes(`Sitemap: ${canonica}sitemap.xml`)) falla("robots.txt no apunta al sitemap");
}

// 6. El JavaScript es válido y no queda nada de trabajo a medias.
const sintaxis = spawnSync(process.execPath, ["--check", path.join(raiz, "app.js")], { encoding: "utf8" });
if (sintaxis.status !== 0) falla(`app.js no es válido: ${sintaxis.stderr.trim()}`);
for (const f of ["index.html", "styles.css", "app.js"]) if (/\b(TODO|FIXME|XXX)\b/.test(leer(f))) falla(`${f} tiene un TODO/FIXME pendiente`);

if (fallos.length) {
  console.error(`✗ ${fallos.length} problema(s):\n` + fallos.map((f) => "  - " + f).join("\n"));
  process.exit(1);
}
console.log(`✓ Todo en orden: ${refs.length} referencias, ${secciones.length} secciones con notas, imágenes y textos traducidos.`);
