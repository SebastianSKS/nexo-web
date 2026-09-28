// El tema y el idioma se ponen antes de dibujar, para que no parpadee. Va en un archivo aparte (no en línea en el HTML)
// para que la página pueda tener una política de seguridad de contenido estricta, sin permitir scripts en línea.
(function () {
  try {
    var t = localStorage.getItem("nexo-web-tema");
    if (t !== "dark" && t !== "light") t = "light";
    document.documentElement.setAttribute("data-theme", t);
    var a = localStorage.getItem("nexo-web-acento");
    if (a) document.documentElement.style.setProperty("--acento", a);
  } catch (e) {}
})();
