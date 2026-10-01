# App Flying · manuales, AIP y herramientas

## Dónde va cada cosa
- `public/aip/`       → aquí van los PDF del AIP (un AD 2 por aeropuerto). Nombre original del eAIP, por ejemplo `AD 2 SKAR - ARMENIA - EL EDEN.pdf`.
- `public/manuales/`  → manuales de los aviones (`c172.pdf`, `tecnam.pdf`).
- `public/mapas/`     → mapas (`colombia.pdf`, `antioquia.pdf`).
- `build.js`          → se ejecuta solo en cada deploy: lee los PDF de `public/aip`, detecta aeropuerto y ciclo, organiza las hojas por categoría y crea `public/aip/index.json`. No lo edites.

## Configuración en Cloudflare Pages (una sola vez)
1. Workers & Pages → Create → **Pages** → **Connect to Git** → elige este repositorio.
2. Framework preset: **None**.
3. Build command: `npm install && npm run build`
4. Build output directory: `public`
5. Deploy.

## Actualizar el AIP cada ciclo (28 días)
1. Descarga los AD 2 nuevos del eAIP.
2. En GitHub, entra a `public/aip`, borra los PDF viejos y sube los nuevos (o reemplázalos con el mismo nombre).
3. Commit. Cloudflare publica solo en 1 o 2 minutos.
4. En el iPad, abre la app con internet y toca «Guardar todos sin conexión».

## Límites
- Cloudflare Pages no publica archivos de 25 MiB o más. Si un PDF pesa más, el deploy lo avisa en el registro (build log).
- La web de GitHub acepta subir archivos de hasta 25 MB. Para más, usa GitHub Desktop.
