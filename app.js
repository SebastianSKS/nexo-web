/* Nexo · página de presentación. Sin dependencias.
   - El texto está escrito en español en el HTML; lo que lleva data-en (o data-en-alt, data-en-title…) tiene su versión en inglés.
   - Tema, idioma y color de acento se recuerdan en este navegador.
   - Modo presentación: tecla P (o el botón ▶). Flechas para pasar de sección, 1–6 para cambiar de pantalla en «Recorrido», Esc para salir. */
(function () {
  "use strict";

  var REPO = "SebastianSKS/nexushub";
  // Cuando exista una cuenta para apoyar (GitHub Sponsors, Ko-fi, Open Collective…), pon aquí su dirección https:
  // aparece el botón «Apoyar el proyecto» y se quita el aviso de que todavía no hay cuenta.
  var URL_APOYO = "";
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
    es: { nuevo: "Novedad de la {v}", proxima: "Próxima versión · {v}", version: "Versión {v}", proxima2: "Próximamente", sinVersion: "Descarga para Windows" },
    en: { nuevo: "New in {v}", proxima: "Next version · {v}", version: "Version {v}", proxima2: "Coming soon", sinVersion: "Download for Windows" },
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
    pintarFechas();
    pintarNotas();
    guardar("nexo-web-idioma", l);
  }

  /* ---------- Tema y color ---------- */
  function aplicarTema(t) {
    doc.setAttribute("data-theme", t);
    var m = $('meta[name="theme-color"]');
    if (m) m.setAttribute("content", t === "dark" ? "#101215" : "#f5f2ea");
    guardar("nexo-web-tema", t);
  }
  function aplicarAcento(c) {
    doc.style.setProperty("--acento", c);
    guardar("nexo-web-acento", c);
    $$("#acentos button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.color === c)); });
  }

  /* ---------- Versión publicada (se lee de GitHub; si falla, todo sigue funcionando con el enlace general) ---------- */
  var versionPublicada = null, tamanoMB = null;
  function comparar(a, b) {
    var x = a.split(".").map(Number), y = b.split(".").map(Number);
    for (var i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); }
    return 0;
  }
  function pintarVersion() {
    var t = textos[idioma];
    $$(".ver-actual").forEach(function (el) {
      var txt = versionPublicada ? t.version.replace("{v}", versionPublicada) : (el.closest(".hero") ? "Nexo" : "");
      if (versionPublicada && tamanoMB && !el.closest(".hero")) txt += " · " + tamanoMB + " MB";
      el.textContent = txt;
    });
    $$(".nuevo").forEach(function (el) {
      var v = el.getAttribute("data-nuevo");
      var salio = versionPublicada && comparar(versionPublicada, v) >= 0;
      var txt = (versionPublicada && !salio ? t.proxima : t.nuevo).replace("{v}", v);
      el.innerHTML = '<span class="insignia">' + txt + "</span>";
    });
  }
  // En el historial, la versión que aún no se publicó dice «Próximamente». (No se muestran fechas: lo que cuenta es lo que cambió.)
  function pintarFechas() {
    var t = textos[idioma];
    $$("time[data-version]").forEach(function (el) {
      var v = el.getAttribute("data-version");
      el.textContent = versionPublicada && comparar(v, versionPublicada) > 0 ? t.proxima2 : "";
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
        if (instalador && instalador.size) tamanoMB = Math.round(instalador.size / 1048576);
        if (instalador && /^https:\/\/github\.com\//.test(instalador.browser_download_url)) {
          $$(".enlace-descarga").forEach(function (a) { a.href = instalador.browser_download_url; });
        }
        pintarVersion();
        pintarFechas();
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
  var reloj = null, inicioPresentacion = 0;
  function pintarTiempo() {
    var seg = Math.floor((Date.now() - inicioPresentacion) / 1000);
    var m = Math.floor(seg / 60), h = Math.floor(m / 60);
    var dos = function (n) { return (n < 10 ? "0" : "") + n; };
    $("#hud-tiempo").textContent = (h ? h + ":" + dos(m % 60) : dos(m)) + ":" + dos(seg % 60);
  }
  function entrarPresentacion() {
    if (presentando) return;
    presentando = true;
    inicioPresentacion = Date.now();
    pintarTiempo();
    reloj = setInterval(pintarTiempo, 1000); // solo mientras se presenta
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
    clearInterval(reloj);
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
    // En pantallas táctiles: deslizar de lado a lado pasa de sección durante la presentación.
    var x0 = null, y0 = null;
    document.addEventListener("touchstart", function (e) { if (presentando && e.touches.length === 1) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; } }, { passive: true });
    document.addEventListener("touchend", function (e) {
      if (!presentando || x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = y0 = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) irA(indiceActual() + (dx < 0 ? 1 : -1));
    }, { passive: true });
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
        if (el.closest(".panel")) return; // las pantallas del recorrido ya se animan al cambiar de pestaña
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) return; // lo que ya se ve no se anima
        el.classList.add("oculto-al-inicio");
        obs.observe(el);
      });
    }

    // El enlace de la barra que corresponde a la sección que se está viendo queda marcado.
    if ("IntersectionObserver" in window) {
      var enlaces = $$(".enlaces a[href^='#']");
      var espia = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) {
          if (!en.isIntersecting) return;
          enlaces.forEach(function (a) {
            if (a.getAttribute("href") === "#" + en.target.id) a.setAttribute("aria-current", "true");
            else a.removeAttribute("aria-current");
          });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      $$("main .slide").forEach(function (s) { espia.observe(s); }); // las secciones sin enlace (portada, cierre…) dejan la barra sin marcar
    }

    // Apoyo: el botón solo aparece si hay una dirección de apoyo configurada.
    if (/^https:\/\//.test(URL_APOYO)) {
      var apoyar = $("#btn-apoyar");
      apoyar.href = URL_APOYO; apoyar.hidden = false;
      $("#aviso-apoyo").hidden = true;
    }
    // «Copiar el enlace»: usa el menú de compartir del sistema si existe y, si no, copia la dirección.
    // (Delegado en el documento: al cambiar de idioma el texto de la lista se reescribe y el botón se vuelve a crear.)
    document.addEventListener("click", function (e) {
      var compartir = e.target.closest && e.target.closest("#btn-compartir");
      if (!compartir) return;
      var datos = { title: "Nexo", text: idioma === "en" ? "Nexo: your degree in one place" : "Nexo: tu carrera en un solo lugar", url: location.href.split("#")[0] };
      if (navigator.share) { navigator.share(datos).catch(function () {}); return; }
      var listo = function () { var t = compartir.textContent; compartir.textContent = idioma === "en" ? "Copied!" : "¡Copiado!"; setTimeout(function () { compartir.textContent = t; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(datos.url).then(listo).catch(function () {});
    });

    // Video de la portada: se pausa cuando no se ve (ahorra batería) y no arranca solo si la persona pidió menos movimiento.
    var video = $(".hero-video");
    if (video) {
      if (sinMovimiento) { video.removeAttribute("autoplay"); video.pause(); }
      else if ("IntersectionObserver" in window) {
        var porPersona = false, porNosotros = false;
        video.addEventListener("pause", function () { if (porNosotros) porNosotros = false; else if (!video.ended) porPersona = true; });
        video.addEventListener("play", function () { porPersona = false; });
        new IntersectionObserver(function (entradas) {
          entradas.forEach(function (en) {
            if (en.isIntersecting) { if (!porPersona && video.paused) video.play().catch(function () {}); }
            else if (!video.paused) { porNosotros = true; video.pause(); }
          });
        }, { threshold: 0.25 }).observe(video);
      }
    }

    pintarVersion();
    pintarFechas();
    leerVersion();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
