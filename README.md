# Nut N But Prius — nutnbutprius.com

Página del taller **Nut N But Prius** (Glendale, AZ · 602-815-7122). Hecha por Toro Technology, noviembre 2026.

## Lo que hace el taller (lista del dueño, 25 nov 2026; reemplaza la del 24 nov)
- **Batería híbrida, Prius 2005–2015:** reacondicionada desde $600 instalada; nueva $3,500 instalada.
- **Inversores, Prius 2005–2015.**
- **Prius 2010–2015 (Gen 3), «you name it, we can fix it», y «full service» (lo pidió el 25 nov; va arriba, en la tarjeta y en el selector):** cambio de motor JDM desde $2,200; bomba de ABS de fábrica instalada
  $2,200; suspensión; compresor de A/C; sobrecalentamiento; mantenimiento; afinaciones completas.
- **A/C:** $80, cualquier año de Prius que use R-134a.
- **Compra** Prius 2010–2015 en cualquier condición (que se pueda mover) y **vende** carros revisados por su taller.
- **Pantalla del tablero (dash display):** solo 2005–2009, $300 (lo confirmó el 25 nov: «leave dash display 2005 to 2009 $300»).
- **Horario (25 nov, su respuesta):** «monday to friday 10 to sometimes, sat with appointment» = lunes a viernes desde las 10 y cierra
  a distinta hora; sábado con cita; domingo cerrado. En la página: «Mon–Fri from 10 AM · Saturday by appointment». Sin hora de
  cierre fija, no va `openingHoursSpecification` en el JSON-LD. Agendar no ofrece domingos.
- **Por qué escogerlos (sus palabras, 25 nov):** se especializan en estos carros; escaneo de diagnóstico GRATIS para verificar
  la falla antes de todo, para que no compres la pieza equivocada; respaldan su trabajo, honestos y confiables. Sección `#why`.
- **25 nov 12:56 (su mensaje):** «2016 and up full service, prices vary» (franja azul bajo las tarjetas y opción en agendar, años
  2016–2026; dijo que mandará más datos) · el diagnóstico es gratis **solo si le hacen el trabajo**, si no **$120** (corregido en
  todos lados) · **instalación a domicilio** con cobro de viaje (tarjeta de batería y selector). Ya no hace «you call I install» (24/7).
- **25 nov 1:14 pm:** «prius only» (se queda) y **Lexus CT 200h 2012–2017, full service** (segunda franja, opción en agendar con años
  2012–2017; el mensaje dice «2014 Lexus CT 200h»).
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
- Secretos (`npx wrangler secret put …`): `BOOKING_TO` (el Gmail del dueño, no se escribe en este repo público),
  `BOOKING_TEST_KEY` y `BOOKING_TEST_TO` (las pruebas van ahí con «[TEST]» en el asunto, nunca al dueño).
- **Número de cita:** NNB-MMDD-XXXX (fecha de Arizona + 4 caracteres sin parecidos). Va en el asunto y arriba del correo, en el
  mensaje de texto y en la pantalla final del cliente. Sin base de datos: sirve para identificar la cita, no lleva cuenta.
- El correo lleva el logo arriba (`assets/email-logo.jpg`, 480×370; en el correo va a 200×154 y 160×123).

## Calendario del taller: nutnbutprius.com/shop (25 nov)
Carlos: «con calendario, por cada agenda, para que no se le pase o se le pierda».
- **Cada cita queda guardada** en D1 (`nutnbutprius`, tablas en `db/schema.sql`) con su número: las de correo las guarda el Worker;
  las de texto, la página al tocar enviar (`POST /api/book/log`; el texto en sí va de teléfono a teléfono, así que si el cliente
  no lo manda, en el calendario aparece pero el texto no llega); y las que el dueño agrega a mano (llamadas, gente que llega).
- **La página /shop** (contraseña = secreto `SHOP_PASSWORD`, se cambia con `npx wrangler secret put SHOP_PASSWORD`; la sesión dura
  6 meses en ese teléfono): contadores (por confirmar, próximos 7 días, visitas, citas en línea, toques a llamar y texto),
  calendario del mes, lista del día, «por confirmar», y cada cita con Text/Call, estado (por confirmar, confirmada, terminada,
  no llegó, cancelada), día y hora exacta, nota, y «Add to my phone calendar» (.ics con alarma una hora antes).
- **Correo diario** a las 8 AM de Arizona (cron `0 15 * * *`) con las citas del día y las que faltan por confirmar; si no hay
  nada, no manda. Prueba sin molestar al dueño: `POST /api/daily-test` con `x-booking-test` (va a `BOOKING_TEST_TO`).
- **Visitas y toques:** el Worker cuenta cada vez que una persona abre la página (no robots) y la página avisa los toques a
  Book, Call, Text, Directions, Facebook y Email (`POST /api/ev`). /shop y /api no entran a Google (robots.txt + noindex).
- Ver o borrar datos: `npx wrangler d1 execute nutnbutprius --remote --command "SELECT * FROM bookings"`.

## De dónde salen los datos
- Logo: **el NUEVO que mandó el dueño por texto el 25 nov 2026** («can you change my logo to this one»): el mismo arte (ardilla, bellota,
  Prius) sobre la bandera de Estados Unidos, 1428×1102. De ese archivo salen `assets/logo.jpg` (compartir y ficha de Google),
  `assets/mascota.jpg` (portada), `assets/ardilla.jpg` (la cara, 256×256: marca de arriba y de abajo), `favicon.ico`, `icon-192.png`,
  `apple-touch-icon.png` y `assets/email-logo.jpg`. Como es más alto que el anterior, en celulares bajos (menos de 700 px de alto) el arte
  va un poco más angosto para que la primera pantalla enseñe lo mismo que antes (regla al final de `styles.css`).
  El anterior era la foto principal de su perfil de Google Maps (1230×1278, con el letrero del teléfono); sigue en el historial de git.
- Dirección (35th Ave & Bell Rd, Glendale, AZ 85308), calificación (4.8 ★, 100 reseñas) y Facebook: su perfil de Google Maps.
- Foto del taller: la que mandó el dueño. Fotos de ambiente (batería, manómetros): hechas con IA para la página.
- No hay reseñas ni cifras inventadas.

## Pendiente
- **El dueño:** en su perfil de Google cambiar «Website» a `https://nutnbutprius.com` y agregar el enlace de citas
  `https://nutnbutprius.com/#book`; lo mismo en su página de Facebook (botón «Book Now»). O agregar a Toro Technology como
  administrador del perfil para hacerlo por él.
- Su perfil de Google solo muestra martes 10–6: el horario lo cambia el dueño desde su perfil.
- Clips de video (`planes/clips/`): 3 clips de 5 s en bucle con el motor de video de Cartelera, esperando el visto bueno.
