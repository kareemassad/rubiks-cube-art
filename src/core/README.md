# Core Module Layout

Core code is grouped by responsibility:

- `cube/`: Rubik cube state, moves, cubie geometry, and exact face construction.
- `image/`: source image sampling, cropping, and Rubik palette quantization.
- `layout/`: row, column, and cube-count constraints.
- `mosaic/`: target-face splitting, cube generation, grouping, and plan identity.
- `storage/`: browser persistence helpers.
- `workers/`: browser worker clients and worker entry points.
- `__tests__/`: unit tests for core behavior.

UI components should import from these folders through their public `index.ts` files when available.
