# Cyberjaya Wind Observatory

React + Vite + MapLibre GL. Run `npm install`, then `npm run dev`. Build with `npm run build`; verify direction conventions with `npm test`.

## Modules
- `src/mapStyle.js`: grayscale OpenFreeMap/OSM vector basemap, real extruded building footprints and Mapzen Terrarium elevation.
- `src/wind.js`: Open-Meteo current modeled wind at 10 m. m/s, meteorological FROM direction, refreshed every ten minutes; abortable requests and no fabricated fallback.
- `src/WindLayer.js`: 5,000 particles, eight fading line segments each, drawn directly in MapLibre's WebGL2 context. CPU advection first, batched GPU rendering. World coordinates follow camera pan, rotation, zoom and pitch. Lifecycle releases GPU resources.
- `src/main.jsx`: map lifecycle, data state, accessible layer toggles, pause, zoom, rotate, tilt, reset and freshness indicators.

## Scope and caveats
One Cyberjaya reading drives a uniform wind field. No CFD, turbulence, building deflection or spatial interpolation. Motion is 12× real speed for visibility; trail length scales with wind speed. Particle display altitude is 60–160 m above sampled terrain, not a physical 10 m airflow simulation. OSM footprints are real; height completeness varies, and tile-provider estimated heights are used where surveyed heights are missing. Terrain exaggeration is 1×. Buildings occlude particles through shared depth testing.

Data: https://open-meteo.com/en/docs (CC BY 4.0; free API is intended for non-commercial usage), https://openfreemap.org/ (OSM attribution), https://registry.opendata.aws/terrain-tiles/ (Mapzen terrain). No API keys needed for this prototype. Production availability depends on external providers; commercial deployment should use an appropriate Open-Meteo plan. No fake data is displayed during an outage.

Next optimization, only after profiling: GPU advection/transform feedback, adaptive particle counts, and terrain sample caching. Build output is a static Vite app deployable to any static host.

## Dependency audit
At creation, npm reports MapLibre advisory GHSA-jrc7-96c5-q579 (HTML sanitizer bypass), with no fixed version available in the registry audit. This app does not use HTML popups or accept user-provided HTML. Review the advisory and upgrade when a patched release is available before adding such features.
