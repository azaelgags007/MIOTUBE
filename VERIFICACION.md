# Verificación de MIOTUBE 2.0.0

## Comprobado

- Compilación TypeScript y Vite de producción.
- Ocho pruebas de lógica y servidor: validación de dominios y protocolos, extracción de JSON, conservación de huecos y posiciones originales, repetidos, páginas siguientes, entradas inválidas y enlace de video con posición/tiempo.
- Prueba de integración de la interfaz en DOM: fondo persistente, listas de la versión anterior, búsqueda numérica, selección de la posición original 3 que corresponde al índice reproducible 1, iframe conservado al compactar y volver arriba, última reproducción, reanudación, favoritos, entradas inválidas y error de la lista con acceso de respaldo.
- Consultas reales del módulo de metadatos a dos listas: «musica concentracion», 88 elementos; y la lista de acceso «Rápido» de CDC, 9 elementos. El título, autor, posición y miniatura provienen de YouTube.
- Paginación verificada con respuestas de prueba que preservan el salto de la posición 1 a la 101. No se encontró una lista larga accesible para validar en vivo páginas posteriores.

## Pendiente de comprobar en el dispositivo

No se ha realizado una prueba en un iPhone físico ni un despliegue en tu Vercel. La prueba de navegador real no pudo ejecutarse en este entorno; las comprobaciones de interfaz utilizaron un DOM y un reproductor simulado. No se ha verificado reproducción real de audio, PiP, pantalla completa ni apertura de la app nativa.

## Recorrido de aceptación en iPhone

1. Abrir desde la misma URL que la versión actual; confirmar listas conservadas.
2. Cambiar a blanco y a negro; cerrar y volver a abrir para comprobar el fondo.
3. Abrir el contenido de una lista accesible; comprobar un título contra su posición en YouTube.
4. Buscar por título y por número; elegir un elemento y escuchar que corresponda.
5. Probar anterior/siguiente, pausa, reproducción, tamaño y compactación.
6. Volver al fondo y regresar al reproductor.
7. Cerrar y abrir la aplicación; pulsar continuar y comprobar video y tiempo.
8. Guardar un favorito, volver a abrir el catálogo y filtrar favoritos.
9. Probar enlace web y enlace a la app de YouTube.

## Alcance de compatibilidad

Requiere conexión para YouTube y metadatos. Las listas privadas o restringidas pueden fallar. La extracción pública puede necesitar mantenimiento si YouTube cambia su formato. El reproductor numérico y el enlace externo siguen disponibles si el catálogo falla, con la advertencia de que su numeración puede diferir de la original si YouTube omite videos.
