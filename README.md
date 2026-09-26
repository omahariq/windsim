# Cyberjaya Wind Observatory

React + Vite + MapLibre GL. `npm install`, `npm run dev`, `npm run build`, `npm test`.

## Search locations

Use the search box to find a city, town or postal code; add a country to disambiguate (for example, Paris, France). Select a result to update the map, place label, coordinates, local-time weather and simulation origin. Old weather requests and solver jobs are cancelled on location changes. The reset-view button returns to the selected place. Pan is kept local to the selected location; use search to move farther away. Place data comes from Open-Meteo / GeoNames. Locations beyond 80° latitude are outside the supported map area. Some mountain regions may exceed the limited vertical flow domain; the map and uniform wind mode remain available.

## Using the flow model

**Flow around obstacles** is enabled by default in Wind particles → Settings. The dashed outline marks a 2.56 × 2.56 km domain. Pan and choose **Rebuild around map center** to move it. Geometry and incoming wind changes recalculate the solution. Wind visibility and pause do not rebuild it. Turning terrain or buildings off also removes them from the physical obstacle model.

Set **Release height above ground** to about 10–30 m to explore flow near buildings. This seeds particles; their computed trajectories can rise or fall. The grid's ground surface is rounded upward, so a 2 m release may be higher than 2 m over the rendered terrain. Color, count, brightness, trail length and visual speed remain adjustable. Visual speed multiplies integration time only; it does not change the physical velocity solution. Turning obstacle mode off restores the original uniform wind visualization.

## Physics and numerical method

This is a **steady, incompressible, inviscid potential-flow approximation**, not validated urban CFD. It solves `u = U + grad(phi)` and `div(u) = 0`. Solid faces enforce zero normal velocity, with free tangential slip. Boundary fluid cells hold perturbation potential zero, approximating uniform far-field wind. There is no atmospheric wind profile extrapolation: Open-Meteo's 10 m modeled wind is a uniform boundary condition throughout the height of the domain.

The domain uses 128 × 128 × 48 cells (20 m horizontal, 10 m vertical). A finite-volume Laplacian is solved by diagonally preconditioned conjugate gradient in a Web Worker. Relative residual tolerance is 1e-4, with a 500-iteration limit. Unconverged results are not displayed. Face fluxes are zero at solid surfaces and reconstructed into staggered velocity arrays. Tracers use trilinear staggered-field interpolation and midpoint/RK2 integration, with displacement bounded by 0.2 of the smallest cell dimension. Voxel traversal checks reject collisions; trail chords are hidden if they intersect solids. Trail history comes from integrated trajectories, without decorative turbulence/noise.

Terrain and building data for the **whole modeled area** are fetched in the worker, independent of the visible map tiles. DEM RGB values use Mapzen Terrarium decoding at zoom 13. OSM polygons at zoom 14 are conservatively rasterized; polygon holes are respected. Buildings are solid columns from terrain to their available `render_height` (provider estimate or 9 m fallback when absent). Roof shape, overhangs and elevated openings are not resolved. Boundary tiles can contribute multiple footprint parts. Failed geometry downloads leave an explicit error rather than silently running without obstacles.

**Limits:** no viscosity/no-slip boundary layer, turbulent wakes, flow separation, gust evolution, thermal buoyancy, atmospheric stability, drag calibration, wind shear, or validated street-level velocity predictions. Narrow alleys may close and small buildings may enlarge on a 20 m grid. The finite boundary affects flow near the domain edges. Terrain and OSM heights are imperfect. Changes in obstacle geometry are not a substitute for survey data. Use a mesh-refined, validated RANS/LES workflow and suitable measured boundary conditions for engineering decisions.

Method reference: [OpenFOAM potentialFoam documentation](https://doc.openfoam.com/2306/tools/processing/solvers/rtm/basic/potentialFoam/). This app implements its own browser solver; it does not run OpenFOAM. Potential flow is commonly an initial field for viscous solvers, not a replacement for turbulence-resolving CFD.

## Validation

Automated tests cover unobstructed uniform/calm flow, building-induced lateral and upward flow, hill updrafts, no-penetration face flux, discrete divergence, footprint holes and thin walls, collision-safe chords, forward/backward advection, wind direction and floating-point projection precision.

A local numerical check with real Cyberjaya map data (center 101.655 E, 2.922 N) included 641 footprint parts, ground elevations 9–90 m and a maximum roof elevation of 144 m. With incoming east/south velocity (-1.2, 0.5) m/s, the solver converged in 211 iterations: relative residual 9.84e-5, maximum interior discrete divergence 2.63e-6 s^-1. This verifies numerical convergence on that geometry, **not physical accuracy against real wind measurements**. The solve took about 1.8 seconds on the development machine; browser/device performance varies.

## Modules

- `src/flow/solver.js`: finite-volume solve, face-velocity interpolation, collision checks and tracer integration.
- `src/flow/geometry.js`: conservative footprint rasterization.
- `src/flow/sceneData.js`: complete-domain terrain/OSM data retrieval and voxel construction.
- `src/flow/worker.js`: background scene loading and solver.
- `src/flow/FlowSimulation.js`: calculation lifecycle, cancellation, status and domain boundary.
- `src/WindLayer.js`: 5,000 default WebGL particle trails; physical and uniform modes.
- `src/particleProjection.js`: local-coordinate projection to avoid GPU world-coordinate jitter.
- `src/wind.js`: Open-Meteo requests, m/s and meteorological FROM-direction conversion; refresh every ten minutes.
- `src/mapStyle.js`: grayscale map, real OSM extrusions and Mapzen terrain.

## Data and dependencies

[Open-Meteo](https://open-meteo.com/en/docs) (CC BY 4.0; free API intended for non-commercial use), [OpenFreeMap](https://openfreemap.org/) / OpenStreetMap, [Mapzen terrain tiles](https://registry.opendata.aws/terrain-tiles/). No keys needed for the prototype. Commercial deployment should use an appropriate weather API plan.

At creation, npm reports MapLibre advisory GHSA-jrc7-96c5-q579 (HTML sanitizer bypass), with no fix available in the registry audit. This app does not accept user-provided HTML or use HTML popups. Review and upgrade when a patched version becomes available.
