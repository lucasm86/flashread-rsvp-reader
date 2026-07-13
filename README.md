# FlashRead

Lector RSVP (Rapid Serial Visual Presentation) para Windows: muestra el texto una palabra (o un chunk de 2-3 palabras) a la vez, centrado en pantalla, con el punto óptimo de reconocimiento (ORP) resaltado para reducir el movimiento ocular y leer más rápido.

El objetivo del proyecto es la **fricción cero para llevar cualquier texto al lector**: seleccionar texto en cualquier programa y verlo en el lector en dos o tres pasos, sin copiar y pegar manualmente en una ventana separada.

## Fase 1 (MVP) — completa

- **Motor de lectura**: ventana sin decoración, siempre visible opcionalmente, ORP resaltado, WPM configurable (100–1000), pausas automáticas en fin de oración/coma, chunks de 1-3 palabras, fuente/colores configurables, controles flotantes ocultables, atajos de teclado, barra de progreso.
- **Panel de texto lateral**: muestra el documento completo dividido en párrafos, resalta la posición de lectura en tiempo real con auto-scroll, y permite saltar a cualquier palabra haciendo clic (útil para saltear rápido partes del texto).
- **Cuatro vías para llevar texto al lector**:
  - Atajo global de portapapeles (`Ctrl+Alt+R` configurable)
  - Arrastrar y soltar archivos `.txt`, `.pdf`, `.docx`
  - Extensión de navegador (Chrome/Edge, Manifest V3) vía menú contextual
  - Ventana de pegado manual
- **App de bandeja del sistema**, instancia única, configuración persistente local (sin backend, 100% offline).

## Stack

- Electron + TypeScript
- Monorepo con npm workspaces: [`packages/core`](packages/core) (parser de texto, chunker, ORP y timing, compartido) + [`packages/desktop`](packages/desktop) (app Electron) + [`packages/extension`](packages/extension) (extensión MV3)
- `electron-store` para persistencia local de configuración
- `pdf-parse` / `mammoth` para extracción de texto de PDF/DOCX
- Comunicación extensión↔app vía WebSocket local (`ws://127.0.0.1:17652`, solo loopback)

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
4. Con la app corriendo, seleccionar texto en una página → clic derecho → "Leer con FlashRead"

### Probar cada vía de ingreso de texto

1. **Portapapeles**: copiá texto (`Ctrl+C`) y apretá `Ctrl+Alt+R`
2. **Drag&drop**: ícono de la bandeja → arrastrá un `.txt`/`.pdf`/`.docx`
3. **Extensión**: como se describe arriba
4. **Pegado manual**: ícono de la bandeja → pegá texto → "Leer" o `Ctrl+Enter`

### Atajos dentro del lector

| Tecla | Acción |
|---|---|
| `Espacio` | Play / pausa |
| `←` / `→` | Chunk anterior / siguiente |
| `Shift+←` / `Shift+→` | Párrafo anterior / siguiente |
| `↑` / `↓` | Velocidad ±25 wpm |
| `T` | Mostrar/ocultar panel de texto completo |
| `Esc` | Cerrar (ocultar) el lector |

La barra de controles también tiene botones ⏪/⏩ para saltar de párrafo, y la esquina superior derecha de la ventana tiene minimizar/cerrar discretos (la ventana no usa marco nativo).

## Fase 2 (pendiente)

Arquitectura preparada pero no implementada:

- Registro como "Abrir con" en Explorador de Windows para `.pdf`/`.docx`/`.txt`
- Entrada directa en el menú contextual de Windows Explorer
- Evaluar un add-in nativo de Word (Office JS)

## Licencia

Sin definir todavía.
