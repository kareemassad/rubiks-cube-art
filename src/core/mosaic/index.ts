import { applyMoves, faceColors, solveState, solvedState, targetKey } from '../cube'
import { buildExactFaceletState } from '../cube/exactFace'
import type {
  GeneratedCube,
  GeneratedCubeGroup,
  MountRotation,
  MosaicPlan,
  MosaicProgress,
  OptimizerOptions,
  RubikColor,
  StickerGrid,
  TargetFace,
} from '../../types'

const MOVE_FACES = ['U', 'R', 'F', 'D', 'L', 'B'] as const
const MOVE_SUFFIXES = ['', "'", '2'] as const
const MOVES = MOVE_FACES.flatMap((face) => MOVE_SUFFIXES.map((suffix) => `${face}${suffix}`))

const DEFAULT_OPTIMIZER: OptimizerOptions = { mode: 'balanced', maxDepth: 3, candidateLimit: 1800 }

type SuggestedLayout = {
  label: 'Min' | 'Balanced' | 'Max'
  rows: number
  cols: number
}

export function chooseAutoLayout(cubeCount: number, imageAspectRatio: number): { rows: number; cols: number } {
  let best = { rows: 1, cols: Math.max(1, cubeCount) }
  let bestScore = Number.POSITIVE_INFINITY

  for (let rows = 1; rows <= cubeCount; rows++) {
    const cols = Math.ceil(cubeCount / rows)
    const aspect = cols / rows
    const emptyPenalty = cols * rows - cubeCount
    const score = Math.abs(aspect - imageAspectRatio) + emptyPenalty * 0.08
    if (score < bestScore) {
      best = { rows, cols }
      bestScore = score
    }
  }

  return best
}

export function suggestLayouts(imageAspectRatio: number, cubeBudget = 2000): SuggestedLayout[] {
  const max = Math.max(1, Math.round(cubeBudget))
  const min = Math.min(120, max)
  const balanced = Math.max(min, Math.round((min + max) / 2))
  const counts = [
    { label: 'Min' as const, count: min },
    { label: 'Balanced' as const, count: balanced },
    { label: 'Max' as const, count: max },
  ]

  return counts.map(({ label, count }) => ({ label, ...chooseAutoLayout(count, imageAspectRatio) }))
}

export function splitIntoTargetFaces(grid: StickerGrid, rows: number, cols: number): TargetFace[] {
  const targets: TargetFace[] = []
  for (let cubeRow = 0; cubeRow < rows; cubeRow++) {
    for (let cubeCol = 0; cubeCol < cols; cubeCol++) {
      targets.push([
        [
          grid[cubeRow * 3][cubeCol * 3],
          grid[cubeRow * 3][cubeCol * 3 + 1],
          grid[cubeRow * 3][cubeCol * 3 + 2],
        ],
        [
          grid[cubeRow * 3 + 1][cubeCol * 3],
          grid[cubeRow * 3 + 1][cubeCol * 3 + 1],
          grid[cubeRow * 3 + 1][cubeCol * 3 + 2],
        ],
        [
          grid[cubeRow * 3 + 2][cubeCol * 3],
          grid[cubeRow * 3 + 2][cubeCol * 3 + 1],
          grid[cubeRow * 3 + 2][cubeCol * 3 + 2],
        ],
      ])
    }
  }
  return targets
}

function reverseMove(move: string): string {
  if (move.endsWith('2')) return move
  if (move.endsWith("'")) return move.slice(0, -1)
  return `${move}'`
}

export function reverseMoves(moves: string[]): string[] {
  return [...moves].reverse().map(reverseMove)
}

export function rotateTargetFace(face: TargetFace, degrees: MountRotation): TargetFace {
  if (degrees === 0) return face.map((row) => [...row]) as TargetFace
  const once: TargetFace = [
    [face[2][0], face[1][0], face[0][0]],
    [face[2][1], face[1][1], face[0][1]],
    [face[2][2], face[1][2], face[0][2]],
  ]
  if (degrees === 90) return once
  if (degrees === 180) return rotateTargetFace(once, 90)
  return rotateTargetFace(rotateTargetFace(once, 90), 90)
}

function canonicalRotatedFace(face: TargetFace): {
  face: TargetFace
  key: string
  mountRotation: MountRotation
} {
  const rotations: MountRotation[] = [0, 90, 180, 270]
  let bestFace = face
  let bestKey = targetKey(face)
  let bestRotation: MountRotation = 0

  for (const rotation of rotations) {
    const rotated = rotateTargetFace(face, rotation)
    const key = targetKey(rotated)
    if (key < bestKey) {
      bestFace = rotated
      bestKey = key
      bestRotation = rotation
    }
  }

  return { face: bestFace, key: bestKey, mountRotation: bestRotation }
}

function countMatches(a: TargetFace, b: TargetFace): number {
  let matched = 0
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (a[row][col] === b[row][col]) matched++
    }
  }
  return matched
}

function candidateScore(matches: number, depth: number, mode: OptimizerOptions['mode']): number {
  const visualWeight = mode === 'moves' ? 6 : mode === 'visual' ? 100 : 24
  const movePenalty = mode === 'visual' ? 0.1 : mode === 'moves' ? 2 : 1
  return matches * visualWeight - depth * movePenalty
}

function centerColor(targetFace: TargetFace): RubikColor {
  return targetFace[1][1]
}

export async function generateCubeForTarget(
  targetFace: TargetFace,
  optimizer: Partial<OptimizerOptions> = {},
): Promise<GeneratedCube> {
  const options = { ...DEFAULT_OPTIMIZER, ...optimizer }
  const displayFace = centerColor(targetFace)
  const exactState = buildExactFaceletState(targetFace)
  if (exactState) {
    const solveMoves = solveState(exactState)
    return {
      targetFace,
      outputFace: targetFace,
      solvedFace: targetFace,
      mountRotation: 0,
      displayFace,
      faceletState: exactState,
      solveMoves,
      buildMoves: reverseMoves(solveMoves),
      score: { matched: 9, total: 9, exact: true, moveCount: solveMoves.length },
    }
  }

  const initial = solvedState()
  const seen = new Set([initial])
  const queue: Array<{ state: string; path: string[] }> = [{ state: initial, path: [] }]
  let best = {
    state: initial,
    path: [] as string[],
    matches: countMatches(faceColors(initial, displayFace), targetFace),
    score: candidateScore(countMatches(faceColors(initial, displayFace), targetFace), 0, options.mode),
  }
  let evaluated = 0

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break
    evaluated++
    const currentFace = faceColors(current.state, displayFace)
    const matches = countMatches(currentFace, targetFace)
    const score = candidateScore(matches, current.path.length, options.mode)

    if (matches === 9) {
      const solveMoves = solveState(current.state)
      return {
        targetFace,
        outputFace: currentFace,
        solvedFace: currentFace,
        mountRotation: 0,
        displayFace,
        faceletState: current.state,
        solveMoves,
        buildMoves: reverseMoves(solveMoves),
        score: { matched: 9, total: 9, exact: true, moveCount: solveMoves.length },
      }
    }

    if (score > best.score) {
      best = { state: current.state, path: current.path, matches, score }
    }

    if (current.path.length >= options.maxDepth || evaluated >= options.candidateLimit) continue

    const previousFace = current.path.at(-1)?.[0]
    for (const move of MOVES) {
      if (previousFace && move[0] === previousFace) continue
      const nextState = applyMoves(current.state, move)
      if (seen.has(nextState)) continue
      seen.add(nextState)
      queue.push({ state: nextState, path: [...current.path, move] })
    }
  }

  const solveMoves = solveState(best.state)
  return {
    targetFace,
    outputFace: faceColors(best.state, displayFace),
    solvedFace: faceColors(best.state, displayFace),
    mountRotation: 0,
    displayFace,
    faceletState: best.state,
    solveMoves,
    buildMoves: reverseMoves(solveMoves),
    score: {
      matched: best.matches,
      total: 9,
      exact: best.matches === 9,
      moveCount: solveMoves.length,
    },
  }
}

export async function generateMosaicPlanFromGrid(
  stickerGrid: StickerGrid,
  options: {
    rows: number
    cols: number
    optimizer?: Partial<OptimizerOptions>
    onProgress?: (progress: MosaicProgress) => void
  },
): Promise<MosaicPlan> {
  const targets = splitIntoTargetFaces(stickerGrid, options.rows, options.cols)
  const cache = new Map<string, { cube: GeneratedCube; index: number; originalKey: string }>()
  let hits = 0
  let misses = 0
  let rotationHits = 0
  let exact = 0
  const cubes: GeneratedCube[] = []

  for (const [index, target] of targets.entries()) {
    const canonical = canonicalRotatedFace(target)
    const key = canonical.key
    const originalKey = targetKey(target)
    const cached = cache.get(key)
    if (cached) {
      hits++
      if (cached.originalKey !== originalKey || canonical.mountRotation !== 0) rotationHits++
      const duplicate = rotateGeneratedCube(cached.cube, target, canonical.mountRotation, cached.index)
      cubes.push(duplicate)
      if (duplicate.score.exact) exact++
      options.onProgress?.({ completed: index + 1, total: targets.length, cacheHits: hits, exact })
      continue
    }
    misses++
    const generated = await generateCubeForTarget(canonical.face, options.optimizer)
    const cube = rotateGeneratedCube(generated, target, canonical.mountRotation)
    cache.set(key, { cube: generated, index, originalKey })
    cubes.push(cube)
    if (cube.score.exact) exact++
    options.onProgress?.({ completed: index + 1, total: targets.length, cacheHits: hits, exact })
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0))
  }

  return { rows: options.rows, cols: options.cols, stickerGrid, cubes, cacheStats: { hits, misses, rotationHits } }
}

export function groupGeneratedCubes(cubes: GeneratedCube[]): GeneratedCubeGroup[] {
  const groups = new Map<string, GeneratedCubeGroup>()
  for (const [index, cube] of cubes.entries()) {
    const id = [
      targetKey(cube.outputFace),
      cube.displayFace,
      cube.buildMoves.join(' '),
      cube.mountRotation,
    ].join('|')
    const group = groups.get(id)
    if (group) {
      group.indices.push(index)
    } else {
      groups.set(id, { id, cube, indices: [index] })
    }
  }
  return [...groups.values()]
}

export function buildOutputStickerGrid(plan: MosaicPlan): StickerGrid {
  const grid: StickerGrid = Array.from({ length: plan.rows * 3 }, () => Array.from({ length: plan.cols * 3 }, () => 'W' as RubikColor))

  for (const [index, cube] of plan.cubes.entries()) {
    const cubeRow = Math.floor(index / plan.cols)
    const cubeCol = index % plan.cols
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        grid[cubeRow * 3 + row][cubeCol * 3 + col] = cube.outputFace[row][col]
      }
    }
  }

  return grid
}

function rotateGeneratedCube(
  cube: GeneratedCube,
  targetFace: TargetFace,
  mountRotation: MountRotation,
  duplicateOf?: number,
): GeneratedCube {
  const outputRotation = ((360 - mountRotation) % 360) as MountRotation
  const outputFace = rotateTargetFace(cube.outputFace, outputRotation)
  const matched = countMatches(outputFace, targetFace)
  return {
    ...cube,
    targetFace,
    outputFace,
    solvedFace: cube.outputFace,
    mountRotation,
    duplicateOf,
    score: {
      ...cube.score,
      matched,
      exact: matched === 9,
    },
  }
}
