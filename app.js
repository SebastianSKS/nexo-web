/* Nexo · página de presentación. Sin dependencias.
   - El texto está escrito en español en el HTML; lo que lleva data-en (o data-en-alt, data-en-title…) tiene su versión en inglés.
   - Tema, idioma y color de acento se recuerdan en este navegador.
   - Modo presentación: tecla P (o el botón ▶). Flechas para pasar de sección, 1–6 para cambiar de pantalla en «Recorrido», Esc para salir. */
(function () {
  "use strict";

  var REPO = "SebastianSKS/nexushub";
  var VERSION_NOVEDADES = "0.2.2";
  var doc = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function guardar(clave, valor) { try { localStorage.setItem(clave, valor); } catch (e) { /* sin almacenamiento: no pasa nada */ } }
  function leer(clave) { try { return localStorage.getItem(clave); } catch (e) { return null; } }

  /* ---------- Idioma ---------- */
  var ATRIBUTOS = { enAlt: "alt", enTitle: "title", enAriaLabel: "aria-label", enHref: "href", enContent: "content" };
  var idioma = "es";
  var textos = {
    es: { nuevo: "Novedad de la {v}", proxima: "Próxima versión · {v}", version: "Versión {v}", sinVersion: "Descarga para Windows" },
    en: { nuevo: "New in {v}", proxima: "Next version · {v}", version: "Version {v}", sinVersion: "Download for Windows" },
  };

  function aplicarIdioma(l) {
    idioma = l;
    doc.lang = l;
    $$("[data-en]").forEach(function (el) {
      if (el.dataset.es === undefined) el.dataset.es = el.tagName === "META" ? el.getAttribute("content") : el.innerHTML;
      var valor = l === "en" ? el.dataset.en : el.dataset.es;
      if (el.tagName === "META") el.setAttribute("content", valor);
      else el.innerHTML = valor;
    });
    $$("*").forEach(function (el) {
      Object.keys(ATRIBUTOS).forEach(function (k) {
        if (k === "enContent" || el.dataset[k] === undefined) return;
        var guardado = "es" + k.slice(2);
        if (el.dataset[guardado] === undefined) el.dataset[guardado] = el.getAttribute(ATRIBUTOS[k]) || "";
        el.setAttribute(ATRIBUTOS[k], l === "en" ? el.dataset[k] : el.dataset[guardado]);
      });
    });
    document.title = l === "en" ? "Nexo · Your degree in one place" : "Nexo · Tu carrera en un solo lugar";
    var btn = $("#btn-idioma .txt-idioma");
    if (btn) btn.textContent = l === "en" ? "ES" : "EN";
    pintarVersion();
    pintarNotas();
    guardar("nexo-web-idioma", l);
  }

  /* ---------- Tema y color ---------- */
  function aplicarTema(t) {
    doc.setAttribute("data-theme", t);
    var m = $('meta[name="theme-color"]');
    if (m) m.setAttribute("content", t === "dark" ? "#0e1116" : "#f6f8fb");
    guardar("nexo-web-tema", t);
  }
  function aplicarAcento(c) {
    doc.style.setProperty("--acento", c);
    guardar("nexo-web-acento", c);
    $$("#acentos button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.color === c)); });
  }

  /* ---------- Versión publicada (se lee de GitHub; si falla, todo sigue funcionando con el enlace general) ---------- */
  var versionPublicada = null;
  function comparar(a, b) {
    var x = a.split(".").map(Number), y = b.split(".").map(Number);
    for (var i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); }
    return 0;
  }
  function pintarVersion() {
    var t = textos[idioma];
    $$(".ver-actual").forEach(function (el) { el.textContent = versionPublicada ? t.version.replace("{v}", versionPublicada) : (el.closest(".hero") ? "Nexo" : ""); });
    $$(".nuevo").forEach(function (el) {
      var v = el.getAttribute("data-nuevo");
      var salio = versionPublicada && comparar(versionPublicada, v) >= 0;
      var txt = (versionPublicada && !salio ? t.proxima : t.nuevo).replace("{v}", v);
      el.innerHTML = '<span class="insignia">' + txt + "</span>";
    });
  }
  function leerVersion() {
    if (!window.fetch) return;
    fetch("https://api.github.com/repos/" + REPO + "/releases/latest", { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (d) {
        var v = String(d.tag_name || "").replace(/^v/, "");
        if (!/^\d+\.\d+\.\d+$/.test(v)) return;
        versionPublicada = v;
        var instalador = (d.assets || []).filter(function (a) { return /-setup\.exe$/.test(a.name); })[0];
        if (instalador && /^https:\/\/github\.com\//.test(instalador.browser_download_url)) {
          $$(".enlace-descarga").forEach(function (a) { a.href = instalador.browser_download_url; });
        }
        pintarVersion();
      })
      .catch(function () { /* sin red o límite de GitHub: se queda el enlace a «última versión» */ });
  }

  /* ---------- Pestañas del recorrido ---------- */
  function elegirPestana(nombre, enfocar) {
    $$(".pestanas [role=tab]").forEach(function (b) {
      var on = b.dataset.tab === nombre;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && enfocar) b.focus();
    });
    $$(".panel").forEach(function (p) { p.classList.toggle("activo", p.dataset.panel === nombre); });
  }

  /* ---------- Modo presentación ---------- */
  var presentando = false;
  function diapositivas() { return $$("main .slide"); }
  function indiceActual() {
    var s = diapositivas(), mitad = window.innerHeight / 2, mejor = 0, dist = Infinity;
    s.forEach(function (el, i) {
      var r = el.getBoundingClientRect();
      var d = Math.abs(r.top + r.height / 2 - mitad);
      if (d < dist) { dist = d; mejor = i; }
    });
    return mejor;
  }
  function irA(i) {
    var s = diapositivas();
    i = Math.max(0, Math.min(s.length - 1, i));
    s[i].scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function pintarNotas() {
    var caja = $("#notas");
    if (!caja || caja.hidden) return;
    var s = diapositivas()[indiceActual()];
    caja.textContent = (idioma === "en" ? s.getAttribute("data-notas-en") : s.getAttribute("data-notas")) || "";
  }
  function alternarNotas() {
    var caja = $("#notas"), on = caja.hidden;
    caja.hidden = !on;
    $("#hud-notas").setAttribute("aria-pressed", String(on));
    pintarNotas();
  }
  function pintarContador() {
    var hud = $("#hud-num");
    if (hud) hud.textContent = indiceActual() + 1 + " / " + diapositivas().length;
    pintarNotas();
  }
  // En presentación cada sección debe caber en la pantalla: si su contenido es más alto, se reduce lo justo.
  function ajustarAlto() {
    diapositivas().forEach(function (s) {
      var c = s.firstElementChild;
      c.style.zoom = "";
      if (!presentando) return;
      var disponible = window.innerHeight - 112, alto = c.scrollHeight;
      if (alto > disponible) c.style.zoom = String(Math.max(0.5, disponible / alto));
    });
  }
  function entrarPresentacion() {
    if (presentando) return;
    presentando = true;
    var actual = indiceActual();
    $$("img[loading=lazy]").forEach(function (img) { img.loading = "eager"; });
    doc.classList.add("presentacion");
    ajustarAlto();
    $("#hud").hidden = false;
    try { if (doc.requestFullscreen) doc.requestFullscreen().catch(function () {}); } catch (e) { /* sin pantalla completa: sigue en la ventana */ }
    requestAnimationFrame(function () { diapositivas()[actual].scrollIntoView({ block: "start" }); pintarContador(); });
  }
  function salirPresentacion() {
    if (!presentando) return;
    presentando = false;
    var actual = indiceActual();
    doc.classList.remove("presentacion");
    ajustarAlto();
    $("#hud").hidden = true;
    $("#notas").hidden = true;
    $("#hud-notas").setAttribute("aria-pressed", "false");
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); } catch (e) { /* ya no estaba en pantalla completa */ }
    requestAnimationFrame(function () { diapositivas()[actual].scrollIntoView({ block: "start" }); });
  }

  function alPulsarTecla(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target, enControl = t && t.closest && t.closest("button, summary, a, input, textarea, select, [role=tab]");
    var k = e.key;
    if (k === "p" || k === "P") { e.preventDefault(); presentando ? salirPresentacion() : entrarPresentacion(); return; }
    if (!presentando) return;
    if (k === "Escape") { e.preventDefault(); salirPresentacion(); return; }
    if (k === "n" || k === "N") { e.preventDefault(); alternarNotas(); return; }
    if (/^[1-6]$/.test(k)) {
      var tabs = $$(".pestanas [role=tab]");
      if (tabs[Number(k) - 1]) { elegirPestana(tabs[Number(k) - 1].dataset.tab); irA(diapositivas().indexOf($("#recorrido"))); }
      return;
    }
    if (t && t.closest && t.closest("[role=tablist]") && /^Arrow(Left|Right)$/.test(k)) return;
    var siguiente = k === "ArrowRight" || k === "ArrowDown" || k === "PageDown" || (k === " " && !enControl);
    var anterior = k === "ArrowLeft" || k === "ArrowUp" || k === "PageUp";
    if (siguiente || anterior) { e.preventDefault(); irA(indiceActual() + (siguiente ? 1 : -1)); }
    else if (k === "Home") { e.preventDefault(); irA(0); }
    else if (k === "End") { e.preventDefault(); irA(diapositivas().length - 1); }
  }

  /* ---------- Arranque ---------- */
  function iniciar() {
    // Idioma: el guardado o el del navegador.
    var l = leer("nexo-web-idioma");
    if (l !== "es" && l !== "en") l = (navigator.language || "es").toLowerCase().indexOf("es") === 0 ? "es" : "en";
    aplicarIdioma(l);

    var acento = leer("nexo-web-acento");
    $$("#acentos button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.color === (acento || "#3b8cff")));
      b.addEventListener("click", function () { aplicarAcento(b.dataset.color); });
    });

    $("#btn-idioma").addEventListener("click", function () { aplicarIdioma(idioma === "es" ? "en" : "es"); });
    $("#btn-tema").addEventListener("click", function () { aplicarTema(doc.getAttribute("data-theme") === "dark" ? "light" : "dark"); });
    $("#btn-presentar").addEventListener("click", entrarPresentacion);
    $("#hud-salir").addEventListener("click", salirPresentacion);
    $("#hud-notas").addEventListener("click", alternarNotas);
    document.addEventListener("keydown", alPulsarTecla);
    window.addEventListener("resize", function () { if (presentando) ajustarAlto(); });
    document.addEventListener("fullscreenchange", function () { if (!document.fullscreenElement && presentando) salirPresentacion(); });

    // Pestañas.
    $$(".pestanas [role=tab]").forEach(function (b, i, todas) {
      b.tabIndex = b.getAttribute("aria-selected") === "true" ? 0 : -1;
      b.addEventListener("click", function () { elegirPestana(b.dataset.tab); });
      b.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        elegirPestana(todas[(i + d + todas.length) % todas.length].dataset.tab, true);
      });
    });

    // Borde de la barra al desplazarse y contador de la presentación.
    var barra = $("#barra"), esperando = false;
    window.addEventListener("scroll", function () {
      if (esperando) return;
      esperando = true;
      requestAnimationFrame(function () {
        esperando = false;
        barra.classList.toggle("con-borde", window.scrollY > 8);
        if (presentando) pintarContador();
      });
    }, { passive: true });

    // Aparición suave al llegar a cada bloque (si el navegador lo permite y la persona no pidió menos movimiento).
    var sinMovimiento = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if ("IntersectionObserver" in window && !sinMovimiento) {
      var obs = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("visto"); obs.unobserve(en.target); } });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
      $$(".tarjeta, .ventana, .tres-pasos li, .chips li, .faq details, .encabezado").forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) return; // lo que ya se ve no se anima
        el.classList.add("oculto-al-inicio");
        obs.observe(el);
      });
    }

    pintarVersion();
    leerVersion();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
