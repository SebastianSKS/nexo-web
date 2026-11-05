// Página para exponer la base de datos de Nexo. Abre nexo.db con SQLite de verdad (sql.js, SQLite compilado a WebAssembly)
// en cuanto carga la página, y de ella salen las cifras, el diagrama, las reglas y los datos: nada está escrito a mano.
// Incluye el modo presentación del sitio (P; flechas; N para las notas). Todo se pinta con textContent, nunca con innerHTML.
(function () {
  "use strict";

  var RUTA_DB = "assets/db/nexo.db";
  var RUTA_WASM = "assets/db/";
  var MAX_FILAS = 200;

  var INTENTOS = [
    { titulo: "Repetir una llave primaria", regla: "PRIMARY KEY", sql: "INSERT INTO materia VALUES ('ARQ', 'Otra materia', 3);" },
    { titulo: "Una evaluación de una materia que no existe", regla: "FOREIGN KEY", sql: "INSERT INTO evaluacion VALUES ('x1', 'NOEXISTE', 'Examen', 10, 80);" },
    { titulo: "Una materia sin nombre", regla: "NOT NULL", sql: "INSERT INTO materia (id_materia, nombre, creditos)\nVALUES ('FIS', NULL, 3);" },
    { titulo: "Una materia con 99 créditos", regla: "CHECK", sql: "INSERT INTO materia VALUES ('FIS', 'Física', 99);" },
    { titulo: "Borrar una materia", regla: "ON DELETE CASCADE", sql: "DELETE FROM materia WHERE id_materia = 'CAL';", cascada: true }
  ];

  var CONSULTAS = [
    { nombre: "Evaluaciones por materia", sql: "SELECT m.nombre AS materia, e.nombre AS evaluacion, e.peso, e.calificacion\nFROM materia m\nJOIN evaluacion e ON e.id_materia = m.id_materia\nORDER BY m.nombre, e.id_evaluacion;" },
    { nombre: "Promedio ponderado", sql: "SELECT m.nombre AS materia,\n       ROUND(SUM(e.calificacion * e.peso) / SUM(e.peso), 1) AS promedio,\n       SUM(e.peso) AS peso_calificado\nFROM materia m\nJOIN evaluacion e ON e.id_materia = m.id_materia\nWHERE e.calificacion IS NOT NULL\nGROUP BY m.id_materia\nORDER BY promedio DESC;" },
    { nombre: "Horario por día", sql: "SELECT CASE c.dia WHEN 0 THEN 'Lunes' WHEN 1 THEN 'Martes' WHEN 2 THEN 'Miércoles'\n                  WHEN 3 THEN 'Jueves' WHEN 4 THEN 'Viernes' WHEN 5 THEN 'Sábado' ELSE 'Domingo' END AS dia,\n       c.inicio, c.fin, m.nombre AS materia, c.aula\nFROM clase c\nLEFT JOIN materia m ON m.id_materia = c.id_materia\nORDER BY c.dia, c.inicio;" },
    { nombre: "Próximos eventos", sql: "SELECT titulo, categoria, fecha, hora\nFROM evento\nWHERE fecha >= '2026-11-05'\nORDER BY fecha, hora;" },
    { nombre: "Archivos por materia", sql: "SELECT m.nombre AS materia, COUNT(a.id_archivo) AS archivos\nFROM materia m\nLEFT JOIN carpeta c ON c.id_materia = m.id_materia\nLEFT JOIN archivo a ON a.id_carpeta = c.id_carpeta\nGROUP BY m.id_materia\nORDER BY archivos DESC;" }
  ];

  var doc = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var SQL = null;
  var db = null;
  var modelo = [];
  var tablaActual = null;

  function crear(etiqueta, clase, texto) {
    var e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }
  function comillas(nombre) { return '"' + String(nombre).replace(/"/g, '""') + '"'; }
  function leer(clave) { try { return localStorage.getItem(clave); } catch (e) { return null; } }
  function guardar(clave, valor) { try { localStorage.setItem(clave, valor); } catch (e) { /* sin almacenamiento: no pasa nada */ } }

  /* ---------- Tema ---------- */
  function aplicarTema(t) { doc.setAttribute("data-theme", t); guardar("nexo-web-tema", t); }

  /* ---------- Base de datos ---------- */
  function cargarMotor() {
    if (SQL) return Promise.resolve();
    if (typeof initSqlJs !== "function") return Promise.reject(new Error("No se cargó el motor de SQLite."));
    return initSqlJs({ locateFile: function (f) { return RUTA_WASM + f; } }).then(function (m) { SQL = m; });
  }
  function abrirBase() {
    return fetch(RUTA_DB).then(function (r) {
      if (!r.ok) throw new Error("No se pudo leer " + RUTA_DB + " (" + r.status + ")");
      return r.arrayBuffer();
    }).then(function (buf) {
      if (db) db.close();
      db = new SQL.Database(new Uint8Array(buf));
      db.run("PRAGMA foreign_keys = ON"); // SQLite no hace cumplir las llaves foráneas si no se le pide
    });
  }
  function filas(sql) { var r = db.exec(sql); return r.length ? r[0].values : []; }
  function contar(tabla) { return filas("SELECT COUNT(*) FROM " + comillas(tabla))[0][0]; }

  // Lee el esquema real: columnas, llaves y el CREATE TABLE de cada tabla.
  function leerModelo() {
    return filas("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").map(function (f) {
      var nombre = f[0];
      return {
        nombre: nombre,
        sql: f[1],
        cols: filas("PRAGMA table_info(" + comillas(nombre) + ")").map(function (c) { return { nombre: c[1], notnull: c[3] === 1, pk: c[5] > 0 }; }),
        fks: filas("PRAGMA foreign_key_list(" + comillas(nombre) + ")").map(function (k) { return { tabla: k[2], desde: k[3], hacia: k[4], alBorrar: k[6] }; })
      };
    });
  }
  function porNombre(n) { return modelo.filter(function (t) { return t.nombre === n; })[0]; }

  function estadisticas() {
    var e = { tablas: modelo.length, columnas: 0, fk: 0, pk: 0, notnull: 0, check: 0, ondelete: 0 };
    modelo.forEach(function (t) {
      e.columnas += t.cols.length;
      e.fk += t.fks.length;
      if (t.cols.some(function (c) { return c.pk; })) e.pk++;
      e.notnull += t.cols.filter(function (c) { return c.notnull; }).length;
      e.check += (t.sql.match(/\bCHECK\s*\(/gi) || []).length;
      e.ondelete += t.fks.filter(function (k) { return k.alBorrar !== "NO ACTION"; }).length;
    });
    e.reglas = e.pk + e.fk + e.notnull + e.check;
    return e;
  }

  /* ---------- Dibujo ---------- */
  function dibujarTabla(res) {
    var tabla = crear("table");
    var cab = crear("tr");
    res.columns.forEach(function (c) { cab.appendChild(crear("th", "", c)); });
    tabla.appendChild(crear("thead")).appendChild(cab);
    var cuerpo = crear("tbody");
    res.values.slice(0, MAX_FILAS).forEach(function (fila) {
      var tr = crear("tr");
      fila.forEach(function (v) {
        var td;
        if (v === null) td = crear("td", "nulo", "NULL");
        else if (v instanceof Uint8Array) td = crear("td", "nulo", "(BLOB, " + v.length + " bytes)");
        else td = crear("td", typeof v === "number" ? "num" : "", String(v));
        tr.appendChild(td);
      });
      cuerpo.appendChild(tr);
    });
    tabla.appendChild(cuerpo);
    var caja = crear("div", "tabla-caja");
    caja.appendChild(tabla);
    return caja;
  }

  function tarjetaTabla(t) {
    var c = crear("div", "tabla-card");
    c.appendChild(crear("p", "tc-nombre", t.nombre));
    var cols = crear("div", "cols");
    t.cols.forEach(function (col) {
      var fk = t.fks.filter(function (k) { return k.desde === col.nombre; })[0];
      var e = crear("span", "col" + (col.pk ? " pk" : "") + (fk ? " fk" : ""), col.nombre);
      if (col.pk) e.title = "Llave primaria";
      if (fk) e.title = "Llave foránea → " + fk.tabla + "." + fk.hacia;
      cols.appendChild(e);
    });
    c.appendChild(cols);
    return c;
  }

  // El árbol sale de las llaves foráneas: la raíz es la tabla a la que más apuntan; sus hijas la referencian,
  // y las nietas referencian a una hija.
  function dibujarModelo() {
    var raizNombre = "materia", conteo = {};
    modelo.forEach(function (t) { t.fks.forEach(function (k) { conteo[k.tabla] = (conteo[k.tabla] || 0) + 1; }); });
    Object.keys(conteo).forEach(function (n) { if (conteo[n] > (conteo[raizNombre] || 0)) raizNombre = n; });
    var raiz = porNombre(raizNombre);
    var hijas = modelo.filter(function (t) { return t.fks.some(function (k) { return k.tabla === raizNombre; }); });
    var usadas = {};
    usadas[raizNombre] = true;

    var arbol = $("#arbol");
    arbol.replaceChildren();
    var cajaRaiz = crear("div", "raiz");
    cajaRaiz.appendChild(tarjetaTabla(raiz));
    arbol.appendChild(cajaRaiz);

    var filaHijas = crear("div", "hijos");
    hijas.forEach(function (h) {
      usadas[h.nombre] = true;
      var nodo = crear("div", "nodo");
      nodo.appendChild(tarjetaTabla(h));
      modelo.filter(function (t) { return t.fks.some(function (k) { return k.tabla === h.nombre; }) && !usadas[t.nombre]; }).forEach(function (n) {
        usadas[n.nombre] = true;
        var sub = crear("div", "sub");
        sub.appendChild(tarjetaTabla(n));
        nodo.appendChild(sub);
      });
      filaHijas.appendChild(nodo);
    });
    arbol.appendChild(filaHijas);

    var sueltas = $("#sueltas");
    sueltas.replaceChildren();
    modelo.filter(function (t) { return !usadas[t.nombre]; }).forEach(function (t) {
      var s = crear("div", "suelta");
      s.appendChild(crear("strong", "", t.nombre));
      s.appendChild(crear("span", "", t.cols.length + " columnas"));
      sueltas.appendChild(s);
    });

    var rel = [];
    modelo.forEach(function (t) { t.fks.forEach(function (k) { rel.push(k.tabla + " 1 — N " + t.nombre); }); });
    $("#relaciones").textContent = rel.join(" · ");
  }

  function dibujarCifras(e) {
    $("#c-tablas").textContent = e.tablas;
    $("#c-columnas").textContent = e.columnas;
    $("#c-relaciones").textContent = e.fk;
    $("#c-reglas").textContent = e.reglas;
    $$("[data-cuenta]").forEach(function (el) { el.textContent = e[el.dataset.cuenta]; });
  }

  /* ---------- Pruebas de las reglas ---------- */
  function probar(item, destino) {
    destino.className = "intento-res";
    try {
      if (item.cascada) {
        var antes = contar("evaluacion");
        db.run("SAVEPOINT demo");
        var despues;
        try {
          db.run(item.sql);
          despues = contar("evaluacion");
        } finally {
          db.run("ROLLBACK TO demo"); // se deshace para poder repetir la demostración
          db.run("RELEASE demo");
        }
        destino.classList.add("exito");
        destino.textContent = "Se borró la materia y, en cascada, sus evaluaciones: evaluacion pasó de " + antes + " a " + despues + " filas. (Lo deshago para poder repetirlo.)";
        return;
      }
      db.run(item.sql);
      destino.classList.add("exito");
      destino.textContent = "La base lo aceptó.";
    } catch (e) {
      destino.classList.add("bloqueado");
      destino.textContent = "✕ " + e.message;
    }
  }
  function dibujarIntentos() {
    var caja = $("#intentos");
    caja.replaceChildren();
    INTENTOS.forEach(function (item) {
      var fila = crear("div", "intento");
      var izq = crear("div");
      var h = crear("h3", "", item.titulo);
      h.appendChild(crear("span", "regla-tag", item.regla));
      izq.appendChild(h);
      izq.appendChild(crear("pre", "", item.sql));
      var der = crear("div", "intento-der");
      var boton = crear("button", "boton chico primario", "Intentar");
      boton.type = "button";
      var res = crear("p", "intento-res");
      res.setAttribute("aria-live", "polite");
      boton.addEventListener("click", function () { probar(item, res); });
      der.appendChild(boton);
      der.appendChild(res);
      fila.appendChild(izq);
      fila.appendChild(der);
      caja.appendChild(fila);
    });
  }

  /* ---------- Datos ---------- */
  function mostrarTabla(nombre) {
    tablaActual = nombre;
    $$("#lista-tablas button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.tabla === nombre)); });
    var n = contar(nombre);
    $("#tabla-titulo").textContent = nombre;
    $("#tabla-filas").textContent = n + (n === 1 ? " fila" : " filas");
    var destino = $("#tabla-datos");
    destino.replaceChildren();
    var res = db.exec("SELECT * FROM " + comillas(nombre) + " LIMIT " + MAX_FILAS);
    if (res.length) destino.appendChild(dibujarTabla(res[0]));
    else destino.appendChild(crear("p", "suave", "Esta tabla no tiene filas."));
    $("#tabla-esquema").textContent = porNombre(nombre).sql;
  }
  function dibujarListaTablas() {
    var lista = $("#lista-tablas");
    lista.replaceChildren();
    modelo.forEach(function (t) {
      var b = crear("button");
      b.type = "button";
      b.dataset.tabla = t.nombre;
      b.setAttribute("aria-pressed", "false");
      b.appendChild(document.createTextNode(t.nombre));
      b.appendChild(crear("span", "n", String(contar(t.nombre))));
      b.addEventListener("click", function () { mostrarTabla(t.nombre); });
      lista.appendChild(b);
    });
    mostrarTabla(tablaActual && porNombre(tablaActual) ? tablaActual : "materia");
  }

  /* ---------- Consultas ---------- */
  function ejecutarConsulta() {
    var sql = $("#sql").value.trim();
    var salida = $("#resultado");
    salida.replaceChildren();
    if (!sql || !db) return;
    try {
      var resultados = db.exec(sql);
      if (!resultados.length) salida.appendChild(crear("p", "msg", "Listo. Filas afectadas: " + db.getRowsModified() + "."));
      resultados.forEach(function (r) {
        var bloque = crear("div");
        bloque.appendChild(dibujarTabla(r));
        var n = r.values.length;
        bloque.appendChild(crear("p", "pie", n + (n === 1 ? " fila" : " filas")));
        salida.appendChild(bloque);
      });
      dibujarListaTablas(); // por si la consulta cambió datos
    } catch (e) {
      salida.appendChild(crear("p", "msg error", "Error: " + e.message));
    }
  }
  function dibujarConsultas() {
    var caja = $("#chips-consultas");
    caja.replaceChildren();
    CONSULTAS.forEach(function (c) {
      var b = crear("button", "", c.nombre);
      b.type = "button";
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        $$("#chips-consultas button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        $("#sql").value = c.sql;
        ejecutarConsulta();
      });
      caja.appendChild(b);
    });
    // La sección entra ya con la primera consulta resuelta, para que no se vea a medias al presentar.
    caja.firstElementChild.setAttribute("aria-pressed", "true");
    $("#sql").value = CONSULTAS[0].sql;
    ejecutarConsulta();
  }

  /* ---------- Arranque de la base ---------- */
  function estado(texto, error) {
    var e = $("#estado-db");
    e.textContent = texto;
    e.className = error ? "cifras-estado error" : "cifras-estado";
    $("#btn-reintentar").hidden = !error;
  }
  function pintarTodo() {
    modelo = leerModelo();
    dibujarCifras(estadisticas());
    dibujarModelo();
    dibujarIntentos();
    dibujarListaTablas();
    dibujarConsultas();
  }
  function iniciarBase() {
    estado("Abriendo la base de datos…");
    return cargarMotor().then(abrirBase).then(function () {
      pintarTodo();
      var version = filas("SELECT sqlite_version()")[0][0];
      estado("Base abierta · SQLite " + version);
      if (presentando) ajustarAlto();
    }).catch(function (e) { estado("No se pudo abrir la base: " + e.message, true); });
  }
  function restablecer() {
    abrirBase().then(function () {
      $("#resultado").replaceChildren();
      pintarTodo();
      $$("#intentos .intento-res").forEach(function (p) { p.textContent = ""; p.className = "intento-res"; });
    }).catch(function (e) { estado("No se pudo restablecer: " + e.message, true); });
  }

  /* ---------- Modo presentación (el mismo del sitio principal) ---------- */
  var presentando = false;
  function diapositivas() { return $$("main .slide"); }
  function indiceActual() {
    var mitad = window.innerHeight / 2, mejor = 0, dist = Infinity;
    diapositivas().forEach(function (el, i) {
      var r = el.getBoundingClientRect();
      var d = Math.abs(r.top + r.height / 2 - mitad);
      if (d < dist) { dist = d; mejor = i; }
    });
    return mejor;
  }
  function irA(i) {
    var s = diapositivas();
    s[Math.max(0, Math.min(s.length - 1, i))].scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function pintarNotas() {
    var caja = $("#notas");
    if (caja.hidden) return;
    caja.textContent = diapositivas()[indiceActual()].getAttribute("data-notas") || "";
  }
  function alternarNotas() {
    var caja = $("#notas"), on = caja.hidden;
    caja.hidden = !on;
    $("#hud-notas").setAttribute("aria-pressed", String(on));
    pintarNotas();
  }
  function pintarContador() {
    $("#hud-num").textContent = indiceActual() + 1 + " / " + diapositivas().length;
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
    var t = e.target;
    // Mientras se escribe una consulta, las teclas son del texto (si no, una «p» saldría de la presentación).
    var escribiendo = t && t.closest && t.closest("textarea, input, select, [contenteditable]");
    var k = e.key;
    if (escribiendo) { if (k === "Escape" && presentando) escribiendo.blur(); return; }
    var enControl = t && t.closest && t.closest("button, summary, a");
    if (k === "p" || k === "P") { e.preventDefault(); presentando ? salirPresentacion() : entrarPresentacion(); return; }
    if (!presentando) return;
    if (k === "Escape") { e.preventDefault(); salirPresentacion(); return; }
    if (k === "n" || k === "N") { e.preventDefault(); alternarNotas(); return; }
    var siguiente = k === "ArrowRight" || k === "ArrowDown" || k === "PageDown" || (k === " " && !enControl);
    var anterior = k === "ArrowLeft" || k === "ArrowUp" || k === "PageUp";
    if (siguiente || anterior) { e.preventDefault(); irA(indiceActual() + (siguiente ? 1 : -1)); }
    else if (k === "Home") { e.preventDefault(); irA(0); }
    else if (k === "End") { e.preventDefault(); irA(diapositivas().length - 1); }
  }

  function iniciar() {
    $("#btn-tema").addEventListener("click", function () { aplicarTema(doc.getAttribute("data-theme") === "dark" ? "light" : "dark"); });
    $("#btn-presentar").addEventListener("click", entrarPresentacion);
    $("#btn-empezar").addEventListener("click", entrarPresentacion);
    $("#hud-salir").addEventListener("click", salirPresentacion);
    $("#hud-notas").addEventListener("click", alternarNotas);
    $("#btn-reintentar").addEventListener("click", iniciarBase);
    $("#btn-reset").addEventListener("click", restablecer);
    $("#btn-ejecutar").addEventListener("click", ejecutarConsulta);
    $("#sql").addEventListener("keydown", function (e) { if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); ejecutarConsulta(); } });
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
    var esperando = false;
    window.addEventListener("scroll", function () {
      if (!presentando || esperando) return;
      esperando = true;
      requestAnimationFrame(function () { esperando = false; pintarContador(); });
    }, { passive: true });

    iniciarBase();
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
