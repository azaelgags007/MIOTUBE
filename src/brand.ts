// Punto unico de verdad de los parametros de marca (§3 de la especificacion).
// Al cambiar BRAND_NAME actualizar tambien: index.html (<title> y
// apple-mobile-web-app-title), public/manifest.webmanifest y CACHE_NAME en public/sw.js.
export const BRAND_NAME = 'Phonoplayer';
export const BRAND_COLOR = '#D4A017';

// Color de acento aplicado por estilo inline, ya que Tailwind no puede generar
// clases a partir de un valor en tiempo de ejecucion.
export const accentBg = { backgroundColor: BRAND_COLOR };
export const accentText = { color: BRAND_COLOR };
export const accentBorder = { borderColor: BRAND_COLOR };
