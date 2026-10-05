# App Flying · manuales, AIP, cartas y herramientas

## Dónde va cada cosa
- `public/aip/`       → PDF del AIP (un AD 2 por aeropuerto), con el nombre original del eAIP, por ejemplo `AD 2 SKAR - ARMENIA - EL EDEN.pdf`.
- `public/cartas/`    → cartas aeronáuticas (`CENTRO.pdf`, `NORTE.pdf`, `SUR.pdf`).
- `public/manuales/`  → manuales de los aviones (`c172.pdf`, `tecnam.pdf`).
- `public/pdf.min.js` y `public/pdf.worker.min.js` → visor de PDF (los nombres llevan punto, no guion bajo).
- `build.js`          → se ejecuta solo en cada deploy: lee `public/aip` y `public/cartas` y crea `public/aip/index.json` y `public/cartas/index.json`. No lo edites.
- `worker/wx-route.js` → código para agregar a tu Worker de Cloudflare (METAR/TAF). No se publica con la app.

## Configuración en Cloudflare Pages (una sola vez)
1. Workers & Pages → Create → **Pages** → **Connect to Git** → elige este repositorio.
2. Framework preset: **None**.
3. Build command: `npm install && npm run build`
4. Build output directory: `public`
5. Deploy.

## Actualizar el AIP cada ciclo (28 días)
1. Descarga los AD 2 nuevos del eAIP.
2. En GitHub, entra a `public/aip`, borra los PDF viejos y sube los nuevos.
3. Commit. Cloudflare publica solo en 1 o 2 minutos.
4. En el iPad, abre la app con internet y toca «Guardar todos sin conexión».

## Notas
- Se guardan en la memoria de la app, en cada dispositivo (no se sincronizan). Hay una nota por documento y una nota general.
- Botón «📝 Mis notas» en el inicio: lista todas, permite exportar y respaldar.

## METAR / TAF y NOTAM
- METAR/TAF: la app guarda la última consulta de cada aeropuerto y la muestra sin conexión. Para que funcione de forma fiable, agrega `worker/wx-route.js` a tu Worker.
- NOTAM: se descarga del Worker y queda guardado; sin conexión abre la última copia.

## Límites
- Cloudflare Pages no publica archivos de 25 MiB o más. `build.js` los marca y la app avisa.
- La web de GitHub acepta subir archivos de hasta 25 MB. Para más, usa GitHub Desktop.
- Si cambias la versión de caché, hazlo igual en `public/sw.js` (`V`) y en `public/index.html` (`CN`).
