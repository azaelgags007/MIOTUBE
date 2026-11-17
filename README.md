# MIOTUBE · Phonoplayer 2.0.0

Reproductor personal de YouTube instalable en iPhone como PWA. Pantalla inicial blanca o negra y reproductor al final de la página.

## Lo que incluye

- Fondo blanco o negro, recordado al volver a abrir.
- Acceso «Ir a música / YouTube» y «Volver a pantalla vacía».
- Un solo reproductor que permanece montado al volver arriba o compactar controles. Tamaño visible mínimo de 200 px; no se oculta ni se lleva a altura cero.
- Listas guardadas, edición, eliminación, orden y selección activa, conservando las claves de almacenamiento de la versión anterior.
- Inicio y salto por número de elemento, anterior, siguiente, reproducción, pausa y tamaño de video.
- Contenido desplegable: posición original, título, autor, duración y miniatura. Búsqueda por título o número exacto, favoritos y selección con un toque.
- Carga automática de las páginas de la lista; nunca renumera resultados filtrados. Se limita cada lote a 50 páginas; si hay más aparece «Cargar siguientes elementos».
- Reanudación voluntaria del último video y segundo registrado por lista. No se reproduce automáticamente al abrir la aplicación.
- Abrir el video seleccionado en YouTube, enlace a la app en móviles y ventana flotante en navegadores que admitan Document Picture-in-Picture.
- Mensajes de conexión, lista privada, videos no disponibles, reproducción automática bloqueada y opción de reintentar.

## Uso

1. Abre la aplicación y pulsa «Ir a música / YouTube».
2. En «Mis listas +», añade un enlace de YouTube con un nombre. Las listas guardadas en la versión anterior se conservan si usas la misma dirección web y el mismo navegador.
3. Inicia por número, abre el contenido para elegir un título, o pulsa «Continuar donde me quedé» si hay una reproducción guardada.
4. Pulsa «Volver a pantalla vacía» para regresar al fondo. El reproductor queda abajo, dentro de la página.
5. En iPhone: Safari → Compartir → Añadir a pantalla de inicio.

## Listado sin clave personal

No requiere configurar Google Cloud, API keys, cuentas adicionales ni variables de entorno. La función `api/playlist.mjs` consulta la página pública de la lista en YouTube y sus siguientes páginas; solo recupera metadatos, no descarga ni retransmite audio o video.

Este acceso a metadatos no es la YouTube Data API oficial. Depende del formato y de la disponibilidad de la página pública: YouTube puede cambiarlo, limitar las solicitudes o restringir una lista. No permite leer listas privadas ni iniciar sesión en la cuenta de YouTube. Ante un fallo se informa al usuario y se conserva el acceso a YouTube. Si no se pueden confirmar posiciones originales, el salto numérico utiliza el orden de elementos disponibles en el reproductor y lo indica en pantalla.

La búsqueda se aplica a los elementos cargados. La pantalla informa si faltan páginas. Los videos repetidos se mantienen como ocurrencias distintas y los elementos no disponibles no provocan una renumeración del catálogo. Si se modifica la lista en YouTube, pulsa «Actualizar»; los favoritos se guardan por posición dentro de la lista.

La calidad y la continuidad del audio fuera de la aplicación, al desplazarse fuera del video o con la pantalla bloqueada dependen del navegador, YouTube, el dispositivo y la cuenta. La aplicación no garantiza audio en segundo plano. El enlace de la app requiere tener YouTube instalado; el enlace web permanece disponible.

## Proyecto y despliegue en Vercel

Este ZIP incluye código fuente, iconos, función del servidor, pruebas, configuración y la compilación `dist/`. No se ha publicado sobre tu proyecto actual.

Para actualizar el proyecto existente, coloca el contenido de esta carpeta en la raíz del repositorio MIOTUBE y conserva su conexión con Vercel. `package.json` declara Node 22.x y `vercel.json` define el comando y la salida. No hay secretos que introducir.

**Publica el proyecto completo, no solo `dist/`:** el listado necesita la función de servidor de `api/` y su módulo `server/`. Abrir `index.html` por doble clic o subir únicamente archivos estáticos no ejecuta esa función.

Después de publicar, cierra y vuelve a abrir la PWA para recoger el nuevo service worker (`phonoplayer-v2.0.0`). Los favoritos y la reproducción se guardan localmente; no hay sincronización entre dispositivos.

## Desarrollo y verificación

```sh
npm ci
npm run dev
```

Vite incluye la misma ruta de metadatos del servidor en desarrollo. Para verificar:

```sh
npm test
npm run test:ui
npm run build
```

`npm test` verifica URLs, posiciones, duplicados, extracción y paginación. `test:ui` verifica los flujos en DOM con un reproductor simulado; no reproduce contenido real de YouTube.

Prueba de navegador opcional (requiere navegador de Playwright y tener `npm run dev` activo):

```sh
npx playwright install chromium
npm run test:browser
```

`npm run preview` solo sirve la compilación estática. Para probar el listado usa `npm run dev` o el proyecto completo en Vercel.

Consulta `VERIFICACION.md` para saber qué se comprobó realmente.

## Referencias

- API oficial del reproductor: https://developers.google.com/youtube/iframe_api_reference
- El catálogo sin clave usa el acceso público descrito arriba, independiente de la API del reproductor.
