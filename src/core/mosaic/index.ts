import { applyMoves, faceColors, normalizeMoves, solveState, solvedState, targetKey } from '../cube'
import { buildExactFaceletState } from '../cube/exactFace'
import { CUBE_PRESET_COUNTS, chooseAutoLayout } from '../layout'
import type {
  GeneratedCube,
  GeneratedCubeGroup,
  MountRotation,
  MosaicPlan,
  MosaicProgress,
  RubikColor,
  StickerGrid,
  TargetFace,
} from '../../types'

type SuggestedLayout = {
  label: 'Small' | 'Recommended' | 'Detailed'
  rows: number
  cols: number
}

export { chooseAutoLayout } from '../layout'

export function suggestLayouts(imageAspectRatio: number): SuggestedLayout[] {
  return CUBE_PRESET_COUNTS.map(({ label, count }) => ({ label, ...chooseAutoLayout(count, imageAspectRatio) }))
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
  return normalizeMoves([...moves].reverse().map(reverseMove))
}

export function verifyBuildMoves(
  buildMoves: string[],
  targetFace: TargetFace,
  displayFace: RubikColor,
): boolean {
  const rebuiltState = applyMoves(solvedState(), buildMoves)
  return targetKey(faceColors(rebuiltState, displayFace)) === targetKey(targetFace)
}

function buildVerifiedMoves(
  faceletState: string,
  targetFace: TargetFace,
  displayFace: RubikColor,
): { solveMoves: string[]; buildMoves: string[]; outputFace: TargetFace } {
  const solveMoves = solveState(faceletState)
  const buildMoves = reverseMoves(solveMoves)
  if (!verifyBuildMoves(buildMoves, targetFace, displayFace)) {
    throw new Error('Cube instructions failed exact face verification')
  }

  return {
    solveMoves,
    buildMoves,
    outputFace: faceColors(applyMoves(solvedState(), buildMoves), displayFace),
  }
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

function centerColor(targetFace: TargetFace): RubikColor {
  return targetFace[1][1]
}

export async function generateCubeForTarget(targetFace: TargetFace): Promise<GeneratedCube> {
  const displayFace = centerColor(targetFace)
  const exactState = buildExactFaceletState(targetFace)
  if (!exactState) throw new Error('Could not generate exact instructions for this cube face.')

  const verified = buildVerifiedMoves(exactState, targetFace, displayFace)
  return {
    targetFace,
    outputFace: verified.outputFace,
    solvedFace: verified.outputFace,
    mountRotation: 0,
    displayFace,
    faceletState: exactState,
    solveMoves: verified.solveMoves,
    buildMoves: verified.buildMoves,
    score: { matched: 9, total: 9, exact: true, moveCount: verified.buildMoves.length },
  }
}

export async function generateMosaicPlanFromGrid(
  stickerGrid: StickerGrid,
  options: {
    rows: number
    cols: number
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
    const generated = await generateCubeForTarget(canonical.face)
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
