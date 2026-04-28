export const MAX_GENERATION_CUBES = 2000

const MIN_CUBE_DIMENSION = 1
const MAX_CUBE_DIMENSION = MAX_GENERATION_CUBES

export function clampCubeDimension(value: number, max = MAX_CUBE_DIMENSION): number {
  if (!Number.isFinite(value)) return MIN_CUBE_DIMENSION
  return Math.min(max, Math.max(MIN_CUBE_DIMENSION, Math.round(value)))
}

export function cubeCount(rows: number, cols: number): number {
  return rows * cols
}

export function maxRowsForColumns(cols: number): number {
  return Math.min(MAX_CUBE_DIMENSION, Math.max(MIN_CUBE_DIMENSION, Math.floor(MAX_GENERATION_CUBES / cols)))
}

export function maxColumnsForRows(rows: number): number {
  return Math.min(MAX_CUBE_DIMENSION, Math.max(MIN_CUBE_DIMENSION, Math.floor(MAX_GENERATION_CUBES / rows)))
}

export function clampRowsForColumns(rows: number, cols: number): number {
  return clampCubeDimension(rows, maxRowsForColumns(cols))
}

export function clampColumnsForRows(cols: number, rows: number): number {
  return clampCubeDimension(cols, maxColumnsForRows(rows))
}

export function canGenerateInstructions(rows: number, cols: number): boolean {
  return cubeCount(rows, cols) <= MAX_GENERATION_CUBES
}

export function chooseLayoutForCubeCount(count: number, imageAspectRatio: number): { rows: number; cols: number } {
  const target = clampCubeDimension(count, MAX_GENERATION_CUBES)
  let best = { rows: 1, cols: target }
  let bestScore = Number.POSITIVE_INFINITY

  for (let rows = 1; rows <= target; rows++) {
    const cols = Math.ceil(target / rows)
    const total = rows * cols
    if (total > MAX_GENERATION_CUBES) continue
    const aspect = cols / rows
    const emptyPenalty = total - target
    const score = Math.abs(aspect - imageAspectRatio) + emptyPenalty * 0.08
    if (score < bestScore) {
      best = { rows, cols }
      bestScore = score
    }
  }

  return best
}

export function layoutLimitMessage(rows: number, cols: number): string | null {
  const total = cubeCount(rows, cols)
  if (total <= MAX_GENERATION_CUBES) return null
  return `${total} cubes is too many for browser-side exact instructions. Keep the layout at ${MAX_GENERATION_CUBES} cubes or fewer.`
}
