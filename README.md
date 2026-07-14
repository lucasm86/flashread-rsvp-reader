# FlashRead

Lector RSVP (Rapid Serial Visual Presentation) para Windows: muestra el texto una palabra (o un chunk de 2-3 palabras) a la vez, centrado en pantalla, con el punto óptimo de reconocimiento (ORP) resaltado para reducir el movimiento ocular y leer más rápido.

El objetivo del proyecto es la **fricción cero para llevar cualquier texto al lector**: seleccionar texto en cualquier programa y verlo en el lector en dos o tres pasos, sin copiar y pegar manualmente en una ventana separada.

## Fase 1 (MVP) — completa

- **Motor de lectura**: ventana sin decoración, siempre visible opcionalmente, ORP resaltado, WPM configurable (100–1000), pausas automáticas en fin de oración/coma, chunks de 1-3 palabras, fuente/colores configurables, controles flotantes ocultables, atajos de teclado, barra de progreso.
- **Panel lateral con pestañas** (dentro del propio lector, tecla `T` o botón 📄):
  - **Texto**: el documento completo dividido en párrafos, con la posición de lectura resaltada en tiempo real (auto-scroll) y salto a cualquier palabra con un clic.
  - **Nuevo**: pegar o arrastrar un texto nuevo sin salir del lector.
  - **Biblioteca**: textos guardados a propósito, para volver a leerlos cuando quieras.
  - **Historial**: registro cronológico de todo lo leído, esté o no guardado en la biblioteca (podés promoverlo a biblioteca desde ahí con un clic).

  No hay una ventana de "pegar texto" separada: el ícono de la bandeja abre directamente el lector con el panel lateral en la pestaña "Nuevo", y desde Biblioteca/Historial "Leer" pasa directo a la lectura mostrando el avance en el panel.
- **Seis vías para llevar texto al lector**:
  - Atajo global de portapapeles (`Ctrl+Alt+R` configurable)
  - Arrastrar y soltar archivos `.txt`, `.pdf`, `.docx`, `.odt`, `.rtf`, `.epub` (sobre el panel "Nuevo" del lector)
  - Pegar una URL en la pestaña "Nuevo" — se descarga y se lee como cualquier otra página
  - Extensión de navegador (Chrome/Edge, Manifest V3) vía menú contextual
  - Pegado manual en la pestaña "Nuevo" del propio lector
  - **"Abrir con FlashRead"** o **"Leer con FlashRead"** desde el menú contextual del Explorador de Windows, para cualquiera de los formatos de arriba (una vez registrado desde Configuración → "Integración con Windows")
- **App de bandeja del sistema**, instancia única, configuración persistente local (sin backend, 100% offline).
- **Empaquetado como instalador NSIS o `.exe` portátil** vía `electron-builder` — ver [Empaquetar para distribución](#empaquetar-para-distribución).
- **Actualizaciones automáticas** (solo la versión instalada con instalador): chequeo silencioso al iniciar, más "Buscar actualizaciones" desde la bandeja o Configuración. Descarga en segundo plano y pide confirmación antes de reiniciar para instalar.
- **Conversión opcional a Markdown** (toggle en Configuración → "Convertir documentos a Markdown antes de leer"): para `.docx`, `.odt` y páginas web (leídas con la extensión o pegando una URL), preserva encabezados, listas y tablas del documento original.
  - Los encabezados y los saltos de párrafo agregan una pausa extra en la reproducción, para percibir el cambio de sección.
  - Las tablas no se leen palabra por palabra: la reproducción se pausa automáticamente y la tabla se muestra completa en el panel lateral; se retoma manualmente.
  - No afecta a `.pdf`, `.rtf` ni `.txt`. Se probó contra la librería oficial de Python (`markitdown`) y ningún conversor logra reconstruir estructura confiable a partir de un PDF; para `.rtf` se probó `officeparser` contra documentos sintéticos y, al no tener el formato una marca real de "encabezado" (solo tamaño/negrita de fuente), termina etiquetando cada párrafo como título — peor que dejarlo en texto plano. Ambos formatos siguen con extracción de texto plano siempre.
  - Si la conversión falla, cae automáticamente a texto plano y avisa con un mensaje discreto (no bloqueante) en el panel o en el lector.
- **Retomar donde quedaste**: al reabrir algo desde Biblioteca o Historial que hayas leído parcialmente, arranca en la última posición en vez de desde cero (con un aviso discreto), en lugar de la palabra 1. La posición se guarda solo, cada pocos segundos mientras reproducís y al pausar/cerrar. Un texto nuevo (pegado, portapapeles, URL) siempre arranca desde el principio.
- **Estadísticas de lectura** (pestaña "Estadísticas" del panel): palabras leídas en total, cantidad de sesiones, tiempo total leído y WPM promedio (calculado sobre el tiempo real reproduciendo, sin contar pausas), más un historial corto de sesiones recientes.
- **Integración con el Explorador de Windows** (toggle en Configuración → "Integración con Windows", botones "Registrar"/"Quitar registro"): agrega FlashRead a la lista de "Abrir con" y una entrada de menú contextual "Leer con FlashRead" para `.txt`/`.pdf`/`.docx`/`.odt`/`.rtf`/`.epub`.
  - Registro por usuario (claves en `HKEY_CURRENT_USER`), sin pedir permisos de administrador y sin cambiar el programa predeterminado de ningún tipo de archivo.
  - Solo disponible en la versión empaquetada (`.exe`); el botón queda deshabilitado en modo desarrollo. El registro apunta al `.exe` actual, así que si movés o reemplazás el archivo hay que volver a registrar (la Configuración detecta y avisa si el registro quedó "stale").
  - Al abrir un archivo así (o con la app ya abierta, al abrir un segundo archivo) se aplica la misma extracción de texto y el mismo toggle de conversión a Markdown que el resto de las vías; queda igual registrado en el Historial.

## Stack

- Electron + TypeScript
- Monorepo con npm workspaces: [`packages/core`](packages/core) (parser de texto, chunker, ORP y timing, compartido) + [`packages/desktop`](packages/desktop) (app Electron) + [`packages/extension`](packages/extension) (extensión MV3)
- `electron-store` para persistencia local de configuración, biblioteca e historial
- `pdf-parse` / `mammoth` / `epub2` para extracción de texto de PDF/DOCX/EPUB
- `officeparser` para `.rtf` (texto plano) y `.odt` (texto plano o Markdown)
- `markitdown-ts` para la conversión opcional a Markdown de `.docx`/HTML (mismo resultado que la librería oficial de Python en esos formatos, sin depender de un runtime de Python)
- Comunicación extensión↔app vía WebSocket local (`ws://127.0.0.1:17652`, solo loopback)
- `electron-builder` para empaquetar el instalador NSIS y el `.exe` portátil de Windows
- `electron-updater` para las actualizaciones automáticas de la versión instalada, vía GitHub Releases

## Estructura

```
packages/
  core/       # lógica compartida (sin dependencias de Electron/DOM)
  desktop/    # app Electron (main, preload, renderer)
  extension/  # extensión de navegador MV3
```

## Desarrollo

```bash
npm install
npm run build                          # compila core + desktop
npm run start -w @flashread/desktop    # lanza la app (queda en la bandeja)
```

o `npm run dev` desde la raíz para build + start en un paso.

### Cargar la extensión sin firmar (Chrome/Edge)

1. `chrome://extensions` (o `edge://extensions`)
2. Activar "Modo de desarrollador"
3. "Cargar descomprimida" → seleccionar `packages/extension`
4. Con la app corriendo, clic derecho en una página:
   - Con texto seleccionado → "Leer con FlashRead" (lee la selección)
   - Sin seleccionar nada → "Leer página completa con FlashRead" (lee toda la página; si la pestaña es un PDF, lo descarga y extrae el texto igual que al arrastrarlo a la app)

### Probar cada vía de ingreso de texto

1. **Portapapeles**: copiá texto (`Ctrl+C`) y apretá `Ctrl+Alt+R`
2. **Drag&drop**: ícono de la bandeja (abre el lector en la pestaña "Nuevo") → arrastrá un `.txt`/`.pdf`/`.docx`/`.odt`/`.rtf`/`.epub` sobre el panel
3. **URL**: pestaña "Nuevo" → pegá una URL en el campo de arriba → "Leer URL"
4. **Extensión**: como se describe arriba
5. **Pegado manual**: ícono de la bandeja → pegá texto en la pestaña "Nuevo" → "Leer" o `Ctrl+Enter`
6. **Abrir con / menú contextual**: solo con el `.exe` empaquetado — Configuración → "Integración con Windows" → "Registrar", después clic derecho sobre un archivo soportado → "Leer con FlashRead" (o "Abrir con" → FlashRead)

### Empaquetar para distribución

```bash
cd packages/desktop
npm run dist:win
```

Genera dos artefactos en `packages/desktop/release/`:
- `FlashRead Setup <version>.exe` — instalador (NSIS, por usuario, sin permisos de administrador). Es la única variante que recibe actualizaciones automáticas.
- `FlashRead <version>.exe` — portátil, sin instalador. Cómodo para probar o para quien prefiera no instalar nada, pero hay que volver a descargarlo a mano en cada versión nueva.

Copiá el que prefieras a tu Escritorio o anclalo a la barra de tareas; ninguno necesita Node ni la terminal para correr.

#### Publicar una nueva versión (con actualizaciones automáticas)

```bash
cd packages/desktop
GH_TOKEN=$(gh auth token) npm run release:win
```

Sube ambos instaladores más el feed `latest.yml` directo a un GitHub Release con el tag de la versión (`build.publish` en `package.json` apunta al repo). Los usuarios con la versión instalada (NSIS) reciben la actualización sola, sin hacer nada.

### Atajos dentro del lector

| Tecla | Acción |
|---|---|
| `Espacio` | Play / pausa |
| `←` / `→` | Chunk anterior / siguiente |
| `Shift+←` / `Shift+→` | Párrafo anterior / siguiente |
| `↑` / `↓` | Velocidad ±25 wpm |
| `T` | Mostrar/ocultar panel de texto completo |
| `Esc` | Cerrar (ocultar) el lector |

La barra de controles también tiene botones ⏪/⏩ para saltar de párrafo, un contador `hh:mm:ss` con el tiempo estimado restante (recalculado en base a las palabras que faltan, la velocidad actual y las pausas de puntuación), y la esquina superior derecha de la ventana tiene minimizar/cerrar discretos (la ventana no usa marco nativo).

## Licencia

[MIT](LICENSE).
