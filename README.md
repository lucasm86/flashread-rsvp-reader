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
- **Cuatro vías para llevar texto al lector**:
  - Atajo global de portapapeles (`Ctrl+Alt+R` configurable)
  - Arrastrar y soltar archivos `.txt`, `.pdf`, `.docx`, `.epub` (sobre el panel "Nuevo" del lector)
  - Extensión de navegador (Chrome/Edge, Manifest V3) vía menú contextual
  - Pegado manual en la pestaña "Nuevo" del propio lector
- **App de bandeja del sistema**, instancia única, configuración persistente local (sin backend, 100% offline).
- **Empaquetado como `.exe` portátil** (sin instalador) vía `electron-builder` — ver [Empaquetar para distribución](#empaquetar-para-distribución).

## Stack

- Electron + TypeScript
- Monorepo con npm workspaces: [`packages/core`](packages/core) (parser de texto, chunker, ORP y timing, compartido) + [`packages/desktop`](packages/desktop) (app Electron) + [`packages/extension`](packages/extension) (extensión MV3)
- `electron-store` para persistencia local de configuración, biblioteca e historial
- `pdf-parse` / `mammoth` / `epub2` para extracción de texto de PDF/DOCX/EPUB
- Comunicación extensión↔app vía WebSocket local (`ws://127.0.0.1:17652`, solo loopback)
- `electron-builder` para empaquetar un `.exe` portátil de Windows

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
2. **Drag&drop**: ícono de la bandeja (abre el lector en la pestaña "Nuevo") → arrastrá un `.txt`/`.pdf`/`.docx`/`.epub` sobre el panel
3. **Extensión**: como se describe arriba
4. **Pegado manual**: ícono de la bandeja → pegá texto en la pestaña "Nuevo" → "Leer" o `Ctrl+Enter`

### Empaquetar para distribución

```bash
cd packages/desktop
npm run dist:win
```

Genera `packages/desktop/release/FlashRead <version>.exe` — un ejecutable portátil (sin instalador). Copialo a tu Escritorio o anclalo a la barra de tareas; no necesita Node ni la terminal para correr.

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

## Fase 2 (pendiente)

Arquitectura preparada pero no implementada:

- Registro como "Abrir con" en Explorador de Windows para `.pdf`/`.docx`/`.txt`
- Entrada directa en el menú contextual de Windows Explorer
- Evaluar un add-in nativo de Word (Office JS)

## Licencia

Sin definir todavía.
