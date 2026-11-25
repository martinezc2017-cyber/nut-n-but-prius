# Nut N But Prius — nutnbutprius.com

Página del taller **Nut N But Prius** (Glendale, AZ · 602-815-7122). Hecha por Toro Technology, noviembre 2026.

## Lo que hace el taller (lista del dueño, 25 nov 2026; reemplaza la del 24 nov)
- **Batería híbrida, Prius 2005–2015:** reacondicionada desde $600 instalada; nueva $3,500 instalada.
- **Inversores, Prius 2005–2015.**
- **Prius 2010–2015 (Gen 3), «you name it, we can fix it»:** cambio de motor JDM desde $2,200; bomba de ABS de fábrica instalada
  $2,200; suspensión; compresor de A/C; sobrecalentamiento; mantenimiento; afinaciones completas.
- **A/C:** $80, cualquier año de Prius que use R-134a.
- **Compra** Prius 2010–2015 en cualquier condición (que se pueda mover) y **vende** carros revisados por su taller.
- **Pantalla del tablero (dash display):** solo 2005–2009, $300 (lo confirmó el 25 nov: «leave dash display 2005 to 2009 $300»).
- **Horario (25 nov, su respuesta):** «monday to friday 10 to sometimes, sat with appointment» = lunes a viernes desde las 10 y cierra
  a distinta hora; sábado con cita; domingo cerrado. En la página: «Mon–Fri from 10 AM · Saturday by appointment». Sin hora de
  cierre fija, no va `openingHoursSpecification` en el JSON-LD. Agendar no ofrece domingos.
- **Por qué escogerlos (sus palabras, 25 nov):** se especializan en estos carros; escaneo de diagnóstico GRATIS para verificar
  la falla antes de todo, para que no compres la pieza equivocada; respaldan su trabajo, honestos y confiables. Sección `#why`.
- **Nada 2016 o más nuevo.** Ya no hace «you call I install» (24/7).
- Pidió «top rated on ChatGPT»: **no se puso**. ChatGPT no califica negocios; sería una calificación inventada con el nombre de
  otra empresa. En su lugar: «Top rated on Google · 4.8 · 100 reviews», que sí es cierto.

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
Ventana de 4 pasos (servicio → año → día y hora → nombre, y si está encendido, texto o correo). 7 servicios: batería, inversor, Gen 3, pantalla, vender mi Prius, comprar un Prius y A/C. Los años dependen del servicio (comprar: «¿qué año buscas?», con «Any year»). En el celular, el último botón abre
Mensajes con la cita ya escrita para el 602-815-7122; en computadora enseña el texto para copiarlo. No aparta horario: el dueño
contesta por texto para confirmar. `https://nutnbutprius.com/#book` abre la ventana directo (para el botón de citas de Google y Facebook).

## Correo (25 nov)
- **info@nutnbutprius.com** reenvía al Gmail del dueño (Cloudflare Email Routing, gratis; regla «info to owner»). El dueño ya
  verificó su dirección. Él prefiere texto («I respond faster»).
- **Citas por correo:** en el paso 4 de agendar, «Send it by Text / Email». Email = teléfono obligatorio, ubicación opcional
  (Carlos). El Worker (`src/worker.js`, `POST /api/book`) manda la cita al secreto `BOOKING_TO` con el binding `EMAIL`
  (gratis a direcciones verificadas), desde bookings@nutnbutprius.com. Celular: texto por defecto; computadora: correo.
  Protección: campo trampa, límite de 5 por minuto por visitante (`BOOK_LIMIT`), largos máximos, teléfono de 10 a 15 dígitos.
- **Encendido (25 nov, después de que la prueba llegó a la bandeja de entrada de Carlos):** la variable `EMAIL_BOOKING` en `wrangler.jsonc` ("on" la enseña; "off" la esconde y el Worker rechaza). info@ sale en la sección del taller, el pie y el JSON-LD.
  Prueba sin encender: `POST /api/book` con el encabezado `x-booking-test` = secreto `BOOKING_TEST_KEY`.
- Secretos (`npx wrangler secret put …`): `BOOKING_TO` (el Gmail del dueño, no se escribe en este repo público) y `BOOKING_TEST_KEY`.

## De dónde salen los datos
- Logo: foto principal de su perfil de Google Maps (original, 1230×1278).
- Dirección (35th Ave & Bell Rd, Glendale, AZ 85308), calificación (4.8 ★, 100 reseñas) y Facebook: su perfil de Google Maps.
- Foto del taller: la que mandó el dueño. Fotos de ambiente (batería, manómetros): hechas con IA para la página.
- No hay reseñas ni cifras inventadas.

## Pendiente
- **El dueño:** en su perfil de Google cambiar «Website» a `https://nutnbutprius.com` y agregar el enlace de citas
  `https://nutnbutprius.com/#book`; lo mismo en su página de Facebook (botón «Book Now»). O agregar a Toro Technology como
  administrador del perfil para hacerlo por él.
- Su perfil de Google solo muestra martes 10–6: el horario lo cambia el dueño desde su perfil.
- Clips de video (`planes/clips/`): 3 clips de 5 s en bucle con el motor de video de Cartelera, esperando el visto bueno.
