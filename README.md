# Nut N But Prius — nutnbutprius.com

Página del taller **Nut N But Prius** (Glendale, AZ · 602-815-7122). Hecha por Toro Technology, noviembre 2026.

## Lo que hace el taller (palabras del dueño, 24 nov 2026)
- **Prius 2005–2009:** baterías híbridas, pantalla del tablero (dash display) e inversores.
- **Prius 2010–2015:** compra, venta y arregla cualquier cosa.
- **A/C:** cualquier Prius **hasta 2015**.
- **Nada 2016 o más nuevo.** Ya no hace «you call I install» (24/7).

## Dónde vive
| Qué | Dónde |
|---|---|
| Sitio en línea | **https://nutnbutprius.com** (www.nutnbutprius.com manda aquí con 301) |
| Hosting | Cloudflare, Worker `nutnbutprius` con los archivos de este repo (static assets), en la misma cuenta donde se registró el dominio |
| Dominio | Cloudflare Registrar (renovación anual) |
| Código | este repo; GitHub Pages lo publica en martinezc2017-cyber.github.io/nut-n-but-prius, que **redirige** al dominio |
| Buscadores | Google Search Console (propiedad `https://nutnbutprius.com/`, verificada; sitemap enviado; indexación pedida el 24 nov) · Bing por IndexNow |

## Archivos
- `index.html`, `styles.css`, `app.js`, `assets/` — la página.
- `src/worker.js` — manda www → nutnbutprius.com y sirve el archivo de verificación de Google. **No quitar** esa verificación.
- `wrangler.jsonc` — configuración del Worker y de los dos dominios.
- `.assetsignore` — lo que NO se sube a Cloudflare (src, configuración, README, planes, .git).
- `robots.txt`, `sitemap.xml`, `d35dc666cc8f74fab511f76413253f63.txt` (clave de IndexNow) — para buscadores.
- `planes/clips/` — plan de los clips de video (primeros cuadros y textos), todavía sin generar.

## Cómo se actualiza
1. Editar los archivos.
2. Subir a Cloudflare: `npx wrangler@4.168.0 deploy` (desde esta carpeta).
3. Guardar en GitHub: `git commit` y `git push`.

## Cómo funciona «Book Now»
Ventana de 4 pasos (servicio → año → día y hora → nombre). Los años dependen del servicio. En el celular, el último botón abre
Mensajes con la cita ya escrita para el 602-815-7122; en computadora enseña el texto para copiarlo. No aparta horario: el dueño
contesta por texto para confirmar. `https://nutnbutprius.com/#book` abre la ventana directo (para el botón de citas de Google y Facebook).

## De dónde salen los datos
- Logo: foto principal de su perfil de Google Maps (original, 1230×1278).
- Dirección (35th Ave & Bell Rd, Glendale, AZ 85308), calificación (4.8 ★, 100 reseñas) y Facebook: su perfil de Google Maps.
- Foto del taller: la que mandó el dueño. Fotos de ambiente (batería, manómetros): hechas con IA para la página.
- No hay reseñas ni cifras inventadas.

## Pendiente
- **El dueño:** en su perfil de Google cambiar «Website» a `https://nutnbutprius.com` y agregar el enlace de citas
  `https://nutnbutprius.com/#book`; lo mismo en su página de Facebook (botón «Book Now»). O agregar a Toro Technology como
  administrador del perfil para hacerlo por él.
- Confirmar si el A/C sigue «desde $80» en Prius (sale de su letrero viejo) y su horario (Google solo muestra martes 10–6).
- Clips de video (`planes/clips/`): 3 clips de 5 s en bucle con el motor de video de Cartelera, esperando el visto bueno.
