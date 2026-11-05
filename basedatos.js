// Página «Base de datos»: abre nexo.db con SQLite de verdad (sql.js, SQLite compilado a WebAssembly) dentro del navegador
// y deja ver sus tablas y correr consultas SQL. Nada sale del equipo. Todo se pinta con textContent (nunca innerHTML),
// así un dato raro de la base no puede colar código en la página.
(function () {
  "use strict";

  var RUTA_DB = "assets/db/nexo.db";
  var RUTA_WASM = "assets/db/";
  var MAX_FILAS = 500;

  var EJEMPLOS = [
    { nombre: "Evaluaciones por materia (JOIN)", sql: "SELECT m.nombre AS materia, e.nombre AS evaluacion, e.peso, e.calificacion\nFROM materia m\nJOIN evaluacion e ON e.id_materia = m.id_materia\nORDER BY m.nombre, e.id_evaluacion;" },
    { nombre: "Promedio ponderado por materia (GROUP BY)", sql: "SELECT m.nombre AS materia,\n       ROUND(SUM(e.calificacion * e.peso) / SUM(e.peso), 1) AS promedio,\n       SUM(e.peso) AS peso_calificado\nFROM materia m\nJOIN evaluacion e ON e.id_materia = m.id_materia\nWHERE e.calificacion IS NOT NULL\nGROUP BY m.id_materia\nORDER BY promedio DESC;" },
    { nombre: "Horario ordenado por día", sql: "SELECT CASE c.dia WHEN 0 THEN 'Lunes' WHEN 1 THEN 'Martes' WHEN 2 THEN 'Miércoles'\n                  WHEN 3 THEN 'Jueves' WHEN 4 THEN 'Viernes' WHEN 5 THEN 'Sábado' ELSE 'Domingo' END AS dia,\n       c.inicio, c.fin, m.nombre AS materia, c.docente, c.aula\nFROM clase c\nLEFT JOIN materia m ON m.id_materia = c.id_materia\nORDER BY c.dia, c.inicio;" },
    { nombre: "Próximos eventos", sql: "SELECT titulo, categoria, fecha, hora\nFROM evento\nWHERE fecha >= '2026-11-05'\nORDER BY fecha, hora;" },
    { nombre: "Archivos guardados por materia", sql: "SELECT m.nombre AS materia, COUNT(a.id_archivo) AS archivos\nFROM materia m\nLEFT JOIN carpeta c ON c.id_materia = m.id_materia\nLEFT JOIN archivo a ON a.id_carpeta = c.id_carpeta\nGROUP BY m.id_materia\nORDER BY archivos DESC;" },
    { nombre: "Llaves foráneas de evaluacion", sql: "PRAGMA foreign_key_list(evaluacion);" },
    { nombre: "Probar la integridad (debe fallar)", sql: "-- La materia 'NOEXISTE' no está en la tabla materia: la llave foránea lo impide.\nINSERT INTO evaluacion VALUES ('x1', 'NOEXISTE', 'Examen', 10, 80);" },
    { nombre: "Borrar una materia (borra en cascada)", sql: "-- ON DELETE CASCADE: al borrar la materia CAL se borran sus evaluaciones.\nDELETE FROM materia WHERE id_materia = 'CAL';\nSELECT id_materia, COUNT(*) AS evaluaciones FROM evaluacion GROUP BY id_materia;" }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var SQL = null;
  var db = null;
  var tablaActual = null;

  function crear(etiqueta, clase, texto) {
    var e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function estado(texto, esError) {
    var e = $("estado");
    e.textContent = texto;
    e.className = esError ? "estado error" : "estado";
  }

  function comillas(nombre) { return '"' + String(nombre).replace(/"/g, '""') + '"'; }

  // Dibuja un resultado de db.exec ({columns, values}) como tabla.
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

  function nombresDeTablas() {
    var r = db.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    return r.length ? r[0].values.map(function (f) { return f[0]; }) : [];
  }

  function contar(tabla) { return db.exec("SELECT COUNT(*) FROM " + comillas(tabla))[0].values[0][0]; }

  function mostrarTabla(nombre) {
    tablaActual = nombre;
    Array.prototype.forEach.call($("lista-tablas").children, function (b) {
      b.setAttribute("aria-selected", b.dataset.tabla === nombre ? "true" : "false");
    });
    var filas = contar(nombre);
    $("tabla-titulo").textContent = nombre;
    $("tabla-filas").textContent = filas + (filas === 1 ? " fila" : " filas");
    var res = db.exec("SELECT * FROM " + comillas(nombre) + " LIMIT " + MAX_FILAS);
    var destino = $("tabla-datos");
    destino.replaceChildren();
    if (res.length) destino.appendChild(dibujarTabla(res[0]));
    else destino.appendChild(crear("p", "suave", "Esta tabla no tiene filas."));
    var stmt = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?");
    stmt.bind([nombre]);
    $("tabla-esquema").textContent = stmt.step() ? stmt.get()[0] : "";
    stmt.free();
  }

  function dibujarLista() {
    var lista = $("lista-tablas");
    lista.replaceChildren();
    nombresDeTablas().forEach(function (nombre) {
      var b = crear("button");
      b.type = "button";
      b.setAttribute("role", "tab");
      b.dataset.tabla = nombre;
      b.appendChild(document.createTextNode(nombre));
      b.appendChild(crear("span", "n", String(contar(nombre))));
      b.addEventListener("click", function () { mostrarTabla(nombre); });
      lista.appendChild(b);
    });
  }

  function refrescar() {
    dibujarLista();
    var nombres = nombresDeTablas();
    if (nombres.length) mostrarTabla(nombres.indexOf(tablaActual) >= 0 ? tablaActual : nombres[0]);
  }

  function ejecutar() {
    var sql = $("sql").value.trim();
    var salida = $("resultado");
    salida.replaceChildren();
    if (!sql) return;
    try {
      var resultados = db.exec(sql);
      if (!resultados.length) {
        salida.appendChild(crear("p", "msg", "Listo. Filas afectadas: " + db.getRowsModified() + "."));
      }
      resultados.forEach(function (r) {
        var bloque = crear("div");
        bloque.appendChild(dibujarTabla(r));
        var n = r.values.length;
        var pie = n + (n === 1 ? " fila" : " filas") + (n > MAX_FILAS ? " (se muestran las primeras " + MAX_FILAS + ")" : "");
        bloque.appendChild(crear("p", "pie", pie));
        salida.appendChild(bloque);
      });
      refrescar(); // por si la consulta cambió datos o tablas
    } catch (e) {
      salida.appendChild(crear("p", "msg error", "Error: " + e.message));
    }
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

  function cargarMotor() {
    if (SQL) return Promise.resolve();
    if (typeof initSqlJs !== "function") return Promise.reject(new Error("No se cargó el motor de SQLite."));
    return initSqlJs({ locateFile: function (f) { return RUTA_WASM + f; } }).then(function (m) { SQL = m; });
  }

  function iniciarConsola() {
    var sel = $("ejemplos");
    EJEMPLOS.forEach(function (e, i) {
      var o = crear("option", "", e.nombre);
      o.value = String(i);
      sel.appendChild(o);
    });
    $("sql").value = EJEMPLOS[0].sql;
    sel.addEventListener("change", function () { $("sql").value = EJEMPLOS[Number(sel.value)].sql; });
    $("btn-ejecutar").addEventListener("click", ejecutar);
    $("sql").addEventListener("keydown", function (e) {
      if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); ejecutar(); }
    });
    $("btn-reset").addEventListener("click", function () {
      abrirBase().then(function () {
        $("resultado").replaceChildren();
        refrescar();
        estado("Base restablecida: los datos vuelven a ser los originales.");
      }).catch(function (e) { estado(e.message, true); });
    });
  }

  function ver() {
    var boton = $("btn-ver");
    boton.disabled = true;
    estado("Abriendo la base de datos…");
    cargarMotor().then(abrirBase).then(function () {
      var version = db.exec("SELECT sqlite_version()")[0].values[0][0];
      var n = nombresDeTablas().length;
      $("visor").hidden = false;
      refrescar();
      estado("Base de datos abierta · SQLite " + version + " · " + n + " tablas.");
      boton.textContent = "Recargar base de datos";
      boton.disabled = false;
      $("visor").scrollIntoView({ behavior: "smooth", block: "start" });
    }).catch(function (e) {
      estado("No se pudo abrir la base de datos: " + e.message, true);
      boton.disabled = false;
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    iniciarConsola();
    $("btn-ver").addEventListener("click", ver);
  });
})();
