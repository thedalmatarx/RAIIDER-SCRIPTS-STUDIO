# Raider Scripts Studio v3.0

Editor 3D de mods GTA V / FiveM (tuning, policía, ropa) construido con React + TypeScript + Three.js, empaquetado como app de escritorio Windows con Electron.

## Novedades v3.0 (optimización completa)

- **Visor 3D reescrito**: `OrbitControls` con damping suave (rotar/pan/zoom con límites), iluminación PBR con entorno HDR (`RoomEnvironment`), sombras PCF suaves 2048px, tone mapping ACES.
- **Rendimiento**: geometrías compartidas en caché, disposición correcta de memoria GPU al reconstruir modelos (`dispose`), `ResizeObserver` en vez de eventos de resize, buffer de estadísticas cada 1 s, pixel ratio limitado a 2x.
- **Interfaz mejorada**: switches modernos, selectores de color nativos para pintura/neón/ropa, pestañas con iconos, barra de estado con FPS/triángulos/draw calls/VRAM, consola de registro con scroll.
- **Presets rápidos**: Patrulla LSPD, FBI Interceptor, Deportivo Tuning y Sigilo Total (configuran vehículo + handling de una vez).
- **Nuevas funciones**: captura de pantalla PNG, rotación automática, alternar sombreado/wireframe, importación de modelos .glb/.gltf, texturas en vivo (.png/.jpg/.webp) y vigilancia de textura (Paint.NET).
- **Pestaña Handling** con exportación `handling.meta` y pestaña **Herramientas** con estadísticas y exportación GLB para Blender.

## Desarrollo

```bash
npm install
npm run dev        # abre en el navegador con recarga automática
```

## Generar el instalador de Windows (installer.exe)

```bash
npm run dist
```

Genera `release/RaiderScriptsStudio-Setup-3.0.0.exe` (instalador NSIS x64 con asistente, acceso directo en escritorio y menú inicio).

> Nota: en Linux sin wine, el script `scripts/patch-nsis.mjs` (se ejecuta solo en `postinstall`) parchea electron-builder para extraer el desinstalador sin ejecutar el instalador. En Windows o macOS no se necesita ningún paso extra.

## Estructura

```
electron/main.cjs      Proceso principal de Electron (ventana, seguridad)
src/App.tsx            Interfaz, pestañas, presets y estado
src/components/Viewer.tsx  Visor 3D (Three.js, OrbitControls, PBR)
src/lib/vehicle.ts     Generador de vehículos con caché de geometrías
src/lib/clothing.ts    Generador de ropa con emisivos nocturnos
src/lib/exporters.ts   Descarga de archivos y handling.meta
scripts/patch-nsis.mjs Parche de electron-builder para builds sin wine
```

## Atajos del visor

- Clic izquierdo + arrastrar: rotar
- Clic derecho + arrastrar: desplazar
- Rueda: zoom

## Descargar la app (Windows)

Los instaladores están en la carpeta [`downloads/`](./downloads):

- **Opción fácil (UN solo archivo, sin partes)**: descarga [`INSTALLER.EXE`](./downloads/INSTALLER.EXE) y haz doble clic → siguiente → siguiente → instalar. Te deja el icono en el escritorio.
- **ZIP portable completo** (instalador .exe + `Instalar.py` + portable): descarga las 2 partes (`RaiderScriptsStudio-v3.0.0.zip.00` y `.01`), ponlas en la misma carpeta y ejecuta `UNIR-ZIP.bat` para reconstruir el ZIP.
- Instrucciones completas en [`downloads/INSTRUCCIONES.txt`](./downloads/INSTRUCCIONES.txt).
