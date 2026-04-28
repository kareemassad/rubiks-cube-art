import { describe, expect, it } from 'vitest'
import { applyMoves, faceColors, solvedState } from '../cube'
import {
  chooseAutoLayout,
  buildOutputStickerGrid,
  generateCubeForTarget,
  generateMosaicPlanFromGrid,
  groupGeneratedCubes,
  rotateTargetFace,
  reverseMoves,
  suggestLayouts,
  splitIntoTargetFaces,
} from '../mosaic'
import { nearestRubikColor } from '../image/palette'
import type { StickerGrid, TargetFace } from '../../types'

describe('mosaic grid math', () => {
  it('chooses a layout close to the source image aspect ratio', () => {
    expect(chooseAutoLayout(30, 1.2)).toEqual({ rows: 5, cols: 6 })
    expect(chooseAutoLayout(9, 1)).toEqual({ rows: 3, cols: 3 })
  })

  it('suggests min, balanced, and max layouts that follow image orientation', () => {
    expect(suggestLayouts(16 / 9)).toEqual([
      { label: 'Min', rows: 8, cols: 15 },
      { label: 'Balanced', rows: 26, cols: 41 },
      { label: 'Max', rows: 34, cols: 59 },
    ])

    expect(suggestLayouts(9 / 16)).toEqual([
      { label: 'Min', rows: 15, cols: 8 },
      { label: 'Balanced', rows: 53, cols: 20 },
      { label: 'Max', rows: 69, cols: 29 },
    ])
  })

  it('scales layout suggestions down to the available cube count', () => {
    expect(suggestLayouts(1, 30)).toEqual([
      { label: 'Min', rows: 6, cols: 5 },
      { label: 'Balanced', rows: 6, cols: 5 },
      { label: 'Max', rows: 6, cols: 5 },
    ])

    expect(suggestLayouts(16 / 9, 300)).toEqual([
      { label: 'Min', rows: 8, cols: 15 },
      { label: 'Balanced', rows: 10, cols: 21 },
      { label: 'Max', rows: 12, cols: 25 },
    ])
  })

  it('splits a sticker grid into row-major 3x3 cube targets', () => {
    const grid: StickerGrid = [
      ['R', 'R', 'R', 'W', 'W', 'W'],
      ['R', 'G', 'R', 'W', 'B', 'W'],
      ['R', 'R', 'R', 'W', 'W', 'W'],
    ]

    const targets = splitIntoTargetFaces(grid, 1, 2)

    expect(targets).toEqual([
      [
        ['R', 'R', 'R'],
        ['R', 'G', 'R'],
        ['R', 'R', 'R'],
      ],
      [
        ['W', 'W', 'W'],
        ['W', 'B', 'W'],
        ['W', 'W', 'W'],
      ],
    ])
  })
})

describe('palette quantization', () => {
  it('maps known colors to Rubik palette letters', () => {
    expect(nearestRubikColor({ r: 250, g: 250, b: 250 })).toBe('W')
    expect(nearestRubikColor({ r: 190, g: 20, b: 45 })).toBe('R')
    expect(nearestRubikColor({ r: 0, g: 70, b: 170 })).toBe('B')
    expect(nearestRubikColor({ r: 255, g: 216, b: 0 })).toBe('Y')
  })
})

describe('cube generation', () => {
  it('generates a legal solved-state solid face without moves', async () => {
    const target: TargetFace = [
      ['R', 'R', 'R'],
      ['R', 'R', 'R'],
      ['R', 'R', 'R'],
    ]

    const generated = await generateCubeForTarget(target, { mode: 'balanced', maxDepth: 2 })

    expect(generated.score.exact).toBe(true)
    expect(generated.buildMoves).toEqual([])
    expect(faceColors(generated.faceletState, generated.displayFace)).toEqual(target)
    expect(generated.outputFace).toEqual(target)
  })

  it('deduplicates target faces that only differ by wall rotation', async () => {
    const target: TargetFace = [
      ['R', 'R', 'R'],
      ['R', 'R', 'W'],
      ['R', 'R', 'R'],
    ]
    const rotated = rotateTargetFace(target, 90)
    const grid: StickerGrid = [...target, ...rotated.map((row) => [...row])]

    const plan = await generateMosaicPlanFromGrid(grid, {
      rows: 2,
      cols: 1,
      optimizer: { mode: 'visual', maxDepth: 2, candidateLimit: 1600 },
    })

    expect(plan.cacheStats.hits).toBe(1)
    expect(plan.cacheStats.rotationHits).toBe(1)
    expect(plan.cubes[1].duplicateOf).toBe(0)
    expect(plan.cubes.some((cube) => cube.mountRotation !== 0)).toBe(true)
  })

  it('reverses solve moves so applying build moves from solved recreates the target face', async () => {
    const knownState = applyMoves(solvedState(), ['R'])
    const target = faceColors(knownState, 'G')

    const generated = await generateCubeForTarget(target, { mode: 'balanced', maxDepth: 2 })
    const rebuilt = applyMoves(solvedState(), generated.buildMoves)

    expect(generated.score.exact).toBe(true)
    expect(reverseMoves(generated.solveMoves)).toEqual(generated.buildMoves)
    expect(faceColors(rebuilt, generated.displayFace)).toEqual(target)
    expect(generated.outputFace).toEqual(target)
  })

  it('builds an exact legal state for an arbitrary target face', async () => {
    const target: TargetFace = [
      ['R', 'B', 'Y'],
      ['G', 'W', 'O'],
      ['B', 'R', 'Y'],
    ]

    const generated = await generateCubeForTarget(target, { mode: 'moves', maxDepth: 1 })
    const rebuilt = applyMoves(solvedState(), generated.buildMoves)

    expect(generated.score.exact).toBe(true)
    expect(generated.score.matched).toBe(9)
    expect(faceColors(rebuilt, generated.displayFace)).toEqual(generated.outputFace)
    expect(generated.outputFace).toEqual(target)
  })
})

describe('mosaic plan generation', () => {
  it('creates a complete plan and caches repeated 3x3 targets', async () => {
    const target: TargetFace = [
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
    ]
    const grid: StickerGrid = [...target, ...target.map((row) => [...row])]

    const plan = await generateMosaicPlanFromGrid(grid, {
      rows: 2,
      cols: 1,
      optimizer: { mode: 'balanced', maxDepth: 1 },
    })

    expect(plan.cubes).toHaveLength(2)
    expect(plan.cacheStats).toEqual({ hits: 1, misses: 1, rotationHits: 0 })

    const groups = groupGeneratedCubes(plan.cubes)
    expect(groups).toHaveLength(1)
    expect(groups[0].indices).toEqual([0, 1])
  })

  it('builds a preview grid from generated cube output faces', async () => {
    const target: TargetFace = [
      ['R', 'R', 'R'],
      ['R', 'R', 'R'],
      ['R', 'R', 'R'],
    ]
    const grid: StickerGrid = [target[0], target[1], target[2]]

    const plan = await generateMosaicPlanFromGrid(grid, {
      rows: 1,
      cols: 1,
      optimizer: { mode: 'balanced', maxDepth: 1 },
    })

    expect(buildOutputStickerGrid(plan)).toEqual(plan.cubes[0].outputFace)
  })

  it('reports generation progress after every cube position', async () => {
    const target: TargetFace = [
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
    ]
    const grid: StickerGrid = [...target, ...target.map((row) => [...row])]
    const completed: number[] = []

    await generateMosaicPlanFromGrid(grid, {
      rows: 2,
      cols: 1,
      optimizer: { mode: 'balanced', maxDepth: 1 },
      onProgress: (progress) => completed.push(progress.completed),
    })

    expect(completed).toEqual([1, 2])
  })
})
