# Optimización general del portafolio

## Respaldo

Antes de los cambios se creó y verificó por SHA-256 una copia completa de 5.825 archivos, incluido Git, en la carpeta hermana Lino Portafolio Web - Copia general 2026-09-04_22-25-27.

## Implementado

- Un único controlador de capítulos, compartido por los nueve proyectos.
- Selección única, seguimiento al hacer scroll y destino fijo durante navegación directa. Se conserva el desplazamiento suave; solo se desactivan las transiciones del menú durante ese recorrido.
- Compensación del encabezado y del menú, con comprobación de posición final tras cambios de altura.
- Medidas del menú principal almacenadas y actualizadas con ResizeObserver, en vez de reescribirlas en cada fotograma.
- Eliminación de alturas provisionales incorrectas en las cuadrículas: estaban desplazando los destinos de los enlaces. Se mantienen la carga diferida de imágenes y la suspensión de animaciones.
- Estado activo y visibilidad de la categoría seleccionada.
- Corrección del gesto vertical sobre fotografía: el carrusel no desplaza internamente las imágenes; permite continuar por la página.
- Reanudación de la secuencia de herramientas después de tocarla.
- Lectores con carga real de páginas próximas, conservando las imágenes originales y la animación de paso de página.
- Controles móviles de 44 px, contador legible que permite ampliar/restablecer, sonido inicialmente desactivado y alternativa a pantalla completa.
- Visores 3D con renderizado bajo demanda: misma resolución, luces, sombras y amortiguación. Pausa fuera de pantalla, conservación de orientación al redimensionar y recuperación del contexto gráfico.
- Encabezado h1 y región main en ambas portadas, enlace para saltar contenido, foco visible, control de foco e inactividad del fondo de los diálogos.
- Alternativa de movimiento reducido según la preferencia del sistema, sin cambiar las animaciones predeterminadas.
- Enlace de LinkedIn corregido y apertura independiente de documentos desde móvil.
- Tres casos UX/UI propios, basados en la información confirmada por el autor. Fuentes en uxui-fuentes.md.
- Canonical, sitemap, robots, metadatos sociales, vista previa PNG y datos estructurados del autor para el dominio confirmado.
- Reglas de caché de Vercel: fuentes de nombre versionado con caché prolongada; imágenes/documentos con caché moderada; HTML/JS/CSS revalidables. No se publicó ni se cambió el alojamiento remoto.
- Servidor local con streaming, rangos HTTP para documentos, compresión de texto, revalidación y exclusión de carpetas privadas.
- Pruebas estáticas, de navegación, de interacción y comparaciones con el respaldo. Flujo de comprobación estática para GitHub.

## Evidencia local

Chrome automatizado, sin afirmar equivalencia con dispositivos físicos:

- Portada y nueve proyectos comprobados a 360, 390, 430, 768, 1024 y 1280 px entre las suites de pruebas.
- Recorridos directos por capítulos: una selección activa y título visible.
- Cuatro lectores comprobados en 390 y 900 px: inicio, salto al final, regreso y ampliación móvil.
- Gestos táctiles emulados en fotografía: horizontal y vertical independientes.
- Herbi y Crafter's Acrylic: cero llamadas de dibujo durante la medición en pausa y fuera de pantalla; llamadas presentes con giro activo.
- Luminé antes: 24 imágenes de página iniciales, 2.969.188 bytes. Después: 5 imágenes, 662.147 bytes. Reducción aproximada del 77,7% en ese escenario, sin recomprimirlas. No equivale a una reducción del 77,7% de toda la web.
- Geometría del título de portada prácticamente idéntica al respaldo; las pequeñas diferencias subpíxel corresponden al instante de la animación.

Capturas y reporte generado en tmp/verification/, excluidos de Git y del despliegue.

## Ejecutar comprobaciones

- npm start: servidor local en 127.0.0.1:8000; PORT permite cambiar el puerto.
- npm test: referencias locales, IDs, scripts inline, controlador único y servidor.
- npm run test:browser: navegación de portada/proyectos y lectores.
- npm run test:interactions: menú, foco, movimiento reducido y gestos de fotografía.
- npm run test:deep: tamaños intermedios, lectores, visores 3D y vista previa social.

Las pruebas de navegador utilizan Playwright y Google Chrome. Se admite la instalación local de Playwright o el runtime incluido con Codex. Fuera de ese entorno, instalar Playwright antes de ejecutarlas. La variable BASELINE_ROOT permite comparar con un respaldo sin modificarlo.

## Validación posterior a publicar

Comprobar Safari/iPhone y Android físicos, pantalla completa y zoom nativos, encabezados de caché reales del despliegue y Core Web Vitals de campo. No se han inventado puntuaciones Lighthouse, FPS garantizados, LCP, INP ni CLS.

Los PDF originales se conservan íntegros. La mejora está en no descargarlos para mostrar un lector de imágenes, y en cargar solo las páginas necesarias. No se sacrificó su calidad por una compresión indiscriminada.
