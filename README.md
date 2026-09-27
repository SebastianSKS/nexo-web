# Nexo · página de presentación

La página web de [Nexo](https://github.com/SebastianSKS/nexushub), la aplicación de escritorio para estudiantes. Sirve para **presentarla y explicarla**: se ve como una página de producto y también se puede **proyectar como una presentación**.

Es un sitio estático, sin dependencias ni pasos de compilación: HTML, CSS y un poco de JavaScript.

## Verla

Abre `index.html` en el navegador, o sirve la carpeta:

```bash
python -m http.server 4180
```

y entra a <http://127.0.0.1:4180>.

## Presentarla

Pulsa **P** (o el botón ▶ de la barra). Cada sección ocupa toda la pantalla.

| Tecla | Hace |
|---|---|
| `→` `↓` `Espacio` `Re Pág` | Sección siguiente |
| `←` `↑` `Av Pág` | Sección anterior |
| `Inicio` / `Fin` | Primera / última sección |
| `1` – `6` | En «Recorrido», cambia de pantalla |
| `N` | Muestra u oculta las notas de quien presenta |
| `Esc` | Sale |

El guion completo, con lo que decir en cada sección, está en [GUION.md](GUION.md).

## Idioma, tema y color

Español e inglés (botón **EN / ES**), tema claro y oscuro, y el color de acento se cambia en la sección «Hazlo tuyo». Todo se recuerda en el navegador.

## Contenido

- `index.html`: el contenido. El texto está en español; lo que lleva `data-en` (o `data-en-alt`, `data-en-title`…) tiene su versión en inglés.
- `styles.css`, `app.js`: estilo y comportamiento (idioma, tema, pestañas, presentación, versión publicada).
- `assets/capturas/`: capturas de la app con datos inventados.
- `tools/`: para rehacer las capturas y comprobar el sitio.

La versión y el enlace de descarga se leen solos del último *release* de GitHub. Si no hay red, el botón lleva a la página de versiones.

## Rehacer las capturas

Con la carpeta `out` de Nexo servida en el puerto 4173 (`npm run build` en el repositorio de la app):

```bash
node tools/capturas.mjs
python tools/a-webp.py
```

## Comprobar el sitio

```bash
node tools/comprobar.mjs
```

Revisa que las imágenes y los enlaces internos existan, que toda imagen tenga texto alternativo y que todo lo que tiene versión en español tenga también la inglesa.

## Publicarla

Es un sitio estático: sirve en cualquier lado. Con **GitHub Pages**: *Settings › Pages › Source: GitHub Actions* y cada cambio en `main` se publica solo (ver `.github/workflows/pagina.yml`). También vale arrastrar la carpeta a Netlify o subirla a Vercel.

Antes de publicarla con un dominio propio, pon la dirección completa en `og:image` (`index.html`) para que se vea la tarjeta al compartir el enlace.
