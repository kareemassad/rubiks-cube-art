# Rubik's Cube Art Generator

Turn an image into a wall of Rubik's cubes and generate repeatable build instructions from solved cubes.

This is a browser-only Vite + React + TypeScript app. Upload an image, choose how many cubes you have, preview the reduced six-color mosaic, then generate grouped instructions for every unique cube face in the wall.

## What It Does

- Uploads a source image locally in the browser.
- Crops and samples the image into a sticker grid.
- Quantizes every sticker to the six Rubik colors: white, yellow, red, orange, blue, and green.
- Splits the sticker grid into per-cube `3x3` target faces.
- Generates legal Rubik cube states whose visible face matches each target face.
- Solves those states back to solved with `cubejs`, then reverses the solution so instructions start from a solved cube.
- Groups duplicate faces, including rotated duplicates, so repeated cubes are not shown as separate instruction cards.
- Provides mosaic preview, cube cards, 3D instruction playback, completion tracking, and browser-side PDF export.

## Quick Start

```bash
pnpm install
pnpm dev
```

Then open the local Vite URL, usually:

```text
http://127.0.0.1:5173/
```

If another Vite server is already running, Vite may choose a different port.

## Scripts

```bash
pnpm dev          # Start the local development server
pnpm build        # Type-check and build the production bundle
pnpm test         # Run the unit/component test suite once
pnpm test:watch   # Run Vitest in watch mode
```

## How The Algorithm Works

1. The source image is loaded locally with `ImageBitmap` when available.
2. The app chooses or accepts a cube layout: `rows x columns`.
3. The image is sampled at sticker resolution: `(rows * 3) x (columns * 3)`.
4. Each sampled pixel is mapped to the nearest Rubik palette color.
5. The sticker grid is split into individual `3x3` target faces.
6. For each target face, the center sticker chooses the display face color.
7. The generator builds a legal full 54-facelet cube state matching the visible face when possible.
8. The cube state is solved back to solved using `cubejs`.
9. The solve is reversed into build moves that a person can apply to a solved physical cube.
10. Duplicate and rotated faces are cached and grouped to reduce repeated work.

The goal is not to solve an arbitrary scrambled cube. The goal is to create instructions that transform solved cubes into the target visible faces needed for cube art.

## Project Structure

```text
src/
  components/       React UI, 3D cube viewer, PDF export, previews
  constants/        Rubik color labels and display copy
  core/             Image, cube, mosaic, layout, worker, and storage logic
  types/            Shared domain types and cubejs declaration
```

Core logic is split by responsibility:

```text
src/core/
  cube/             Cube state, move parsing, cubie geometry, exact face states
  image/            Image crop, sampling, and palette quantization
  layout/           Cube count and row/column constraints
  mosaic/           Plan generation, grouping, identity, output sticker grids
  storage/          localStorage helpers
  workers/          Browser worker clients and worker entry points
  __tests__/        Core tests
```

See [`src/core/README.md`](src/core/README.md) for the core module layout notes.

## Important Domain Types

```ts
type RubikColor = 'W' | 'Y' | 'R' | 'O' | 'B' | 'G'
type TargetFace = RubikColor[][]

type GeneratedCube = {
  targetFace: TargetFace
  outputFace: TargetFace
  faceletState: string
  solveMoves: string[]
  buildMoves: string[]
}
```

The full type definitions live in [`src/types/rubiks.ts`](src/types/rubiks.ts).

## Browser-Only Design

The app does not require a backend. Image processing, cube generation, caching, 3D playback, completion state, and PDF export all run in the browser.

For heavier layouts, preview and generation work is pushed into Web Workers so the UI stays responsive.

## Current Limits

- Generation is capped at 2,000 cubes for browser-side performance.
- Large source images are capped at 2,400px for generation to protect browser memory.
- V1 targets one visible face per cube. Side and top colors only matter as needed to keep the cube state legal.
- Every generated instruction face is exact. If a requested visible face cannot be represented as a legal cube state, generation stops instead of returning instructions that could build the wrong face.
- PDF export is client-side and can be slower for very large mosaics.

## Attribution

This project adapts ideas and selected implementation patterns from [`jeffhuber/rubiks-solver`](https://github.com/jeffhuber/rubiks-solver), including the 54-facelet cube representation, `cubejs`/Kociemba solve flow, move parsing concepts, and 2D/3D cube visualization patterns.

See [`NOTICE`](NOTICE) for attribution details.

## License

MIT
