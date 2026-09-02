# Phonoplayer

PWA independiente para reproducir listas de YouTube en un panel fijo superior, con controles de
reproducción, zoom del reproductor y listas configurables por el usuario.

- **Marca:** Phonoplayer
- **Color de acento:** `#D4A017`
- **Stack:** React 18 + TypeScript + Vite + Tailwind 3.4, Node 20.x, despliegue en Vercel

---

## Arranque local

```bash
npm install
npm run dev      # http://localhost:5173
```

## Verificación antes de desplegar

```bash
npx tsc --noEmit -p tsconfig.app.json   # sin errores
npm run build                           # compila
npm run preview                         # sirve dist/ para probar la PWA
```

> El service worker y el manifest solo se comportan como en producción cuando se sirve `dist/`
> (`npm run preview`) o desde el despliegue real, no desde `npm run dev`.

## Despliegue en Vercel

1. Sube el repositorio a GitHub.
2. En Vercel: **New Project** → importar el repo.
3. Framework preset **Vite**, build `npm run build`, output `dist`. No hace falta configurar nada más.
4. Tras cada despliegue, **incrementa `CACHE_NAME` en `public/sw.js`** (`phonoplayer-v1` →
   `phonoplayer-v2`, …) para que los clientes ya instalados recojan los assets nuevos.

## Instalación en iOS (sin App Store)

Safari → compartir → **Añadir a pantalla de inicio**. Da ícono propio, pantalla completa sin barra
del navegador y respeta el notch mediante `viewport-fit=cover` +
`apple-mobile-web-app-status-bar-style: black-translucent`.

---

## Calidad de reproducción mínima

La app solicita la calidad más baja (`tiny`) al arrancar cada video, para ahorrar datos.

Detalles de implementación en `src/components/PlayerPanel.tsx`:

- El comando se envía vía `postMessage` (`setPlaybackQuality`) al recibir `onReady` del iframe.
- Se **reenvía en cada `onStateChange` con `info === 1`** (reproduciendo), porque YouTube
  renegocia la calidad en cada cambio de pista dentro de una playlist.
- Se añadió un **handshake `listening`** al cargar el iframe. Sin él, el embed de YouTube nunca
  emite eventos hacia la página padre y ni la detección de video no disponible ni el ajuste de
  calidad funcionarían.

> **Es una sugerencia, no una garantía.** Con streaming adaptativo (DASH), YouTube puede ignorar la
> petición y subir la calidad según el ancho de banda detectado, sobre todo en `videoseries`. No
> existe forma de forzarlo desde la IFrame API. No usar `vq=` en la URL: no es API soportada.

## Picture-in-Picture — no modificar

Ver §8 de la especificación. Resumen: el `<video>` vive dentro de un iframe de `youtube.com`, otro
origen, así que `contentDocument` es siempre `null` y `requestPictureInPicture()` es inalcanzable.
No es un bug; es una restricción del navegador sin solución del lado del cliente.

- **Chromium de escritorio** (`documentPictureInPicture` disponible): botón `⧉`, mueve el nodo del
  reproductor a una ventana flotante y lo devuelve al cerrarla.
- **iOS y el resto:** botón `↗`, abre la lista en la app nativa de YouTube vía esquema `youtube://`,
  con respaldo a la URL web tras 700 ms. Ahí sí funcionan el PiP del sistema y el audio en segundo
  plano.

## Detalles críticos que no deben "optimizarse"

- **El iframe nunca se desmonta** al pasar de `expanded` a `bar`: solo se le da altura 0.
  Desmontarlo cortaría el audio. Esta es la razón de que siga sonando al hacer scroll.
- **`enablejsapi=1` es obligatorio** en la URL de embed; sin él no hay controles.
- **El botón "Reanudar" remonta el iframe** cambiando su `key`. iOS suspende el iframe al salir de
  la app y no hay forma de reanudar sin remontar (el video reinicia desde el principio: es el
  comportamiento esperado, no un fallo).
- **El service worker no cachea** `youtube.com`, `youtu.be`, `googlevideo.com`, `ytimg.com` ni
  `ggpht.com`.

---

## Cambiar los parámetros de marca

`src/brand.ts` es la fuente de verdad del nombre y el color en la UI. Al cambiar el nombre,
actualizar además:

- `index.html` → `<title>` y `<meta name="apple-mobile-web-app-title">`
- `public/manifest.webmanifest` → `name` y `short_name`
- `public/sw.js` → `CACHE_NAME`

Para regenerar los iconos desde otro logo: editar `SRC` en `scripts/make-icons.py` y ejecutar
`python3 scripts/make-icons.py` (requiere Pillow). Genera fondo blanco sólido con el emblema al 80%,
remuestreo LANCZOS.

## Fuera de alcance

Sin seguimiento de entrenamientos, temporizadores, base de datos, historial, IndexedDB,
backup/restore ni funcionalidad de fitness. La app hace una sola cosa.
