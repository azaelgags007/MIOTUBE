# Verificación de MIOTUBE 2.1.0

## Comprobado

- Compilación TypeScript y Vite de producción.
- Ocho pruebas de lógica y servidor: validación de dominios y protocolos, extracción de JSON, conservación de huecos y posiciones originales, repetidos, páginas siguientes, entradas inválidas y enlace de video con posición/tiempo.
- Prueba de integración de la interfaz en DOM: pantalla vacía sin botones permanentes, accesos temporales, aislamiento de foco del reproductor mientras se ve el fondo, fondo persistente, listas de la versión anterior, controles unificados de reproducción/pausa, menús, expansión de títulos, búsqueda numérica, selección de la posición original 3 que corresponde al índice reproducible 1, iframe conservado al compactar y volver arriba, última reproducción, reanudación, favoritos, entradas inválidas y error de la lista con acceso de respaldo.
- Consultas reales del módulo de metadatos a dos listas: «musica concentracion», 88 elementos; y la lista de acceso «Rápido» de CDC, 9 elementos. El título, autor, posición y miniatura provienen de YouTube.
- Paginación verificada con respuestas de prueba que preservan el salto de la posición 1 a la 101. No se encontró una lista larga accesible para validar en vivo páginas posteriores.

## Pendiente de comprobar en el dispositivo

No se ha realizado una prueba en un iPhone físico. Las pruebas automatizadas de interfaz utilizan un DOM y un reproductor simulado. La compilación y el despliegue se comprueban con el estado de Vercel correspondiente al commit publicado. La apertura y las interacciones básicas se revisan también en la URL pública; esto no sustituye la prueba de audio, PiP y apertura de la app nativa en iPhone.

## Recorrido de aceptación en iPhone

1. Abrir desde la misma URL que la versión actual; confirmar listas conservadas.
2. Abrir Apariencia (luna/sol), cambiar a blanco y a negro; cerrar y volver a abrir para comprobar el fondo.
3. Abrir el contenido de una lista accesible; comprobar un título contra su posición en YouTube.
4. Buscar por título y por número; elegir un elemento y escuchar que corresponda.
5. Probar anterior/siguiente y el botón central de reproducción/pausa. En «Más opciones» (tres puntos), comprobar tamaño y vista compacta.
6. Volver al fondo con el icono cuadrado y comprobar que no hay botones permanentes ni barra de desplazamiento. Tocar, comprobar que los accesos aparecen y vuelven a ocultarse, y regresar al reproductor.
7. Cerrar y abrir la aplicación; pulsar continuar y comprobar video y tiempo.
8. Guardar un favorito, volver a abrir el catálogo y filtrar favoritos.
9. Probar enlace web y enlace a la app de YouTube.

## Alcance de compatibilidad

Requiere conexión para YouTube y metadatos. Las listas privadas o restringidas pueden fallar. La extracción pública puede necesitar mantenimiento si YouTube cambia su formato. El reproductor numérico y el enlace externo siguen disponibles si el catálogo falla, con la advertencia de que su numeración puede diferir de la original si YouTube omite videos.
