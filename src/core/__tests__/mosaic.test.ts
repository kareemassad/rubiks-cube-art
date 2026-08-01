import { describe, expect, it } from 'vitest'
import { applyMoves, faceColors, normalizeMoves, solvedState } from '../cube'
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
  verifyBuildMoves,
} from '../mosaic'
import { nearestRubikColor } from '../image/palette'
import type { StickerGrid, TargetFace } from '../../types'

describe('mosaic grid math', () => {
  it('chooses a layout close to the source image aspect ratio', () => {
    expect(chooseAutoLayout(30, 1.2)).toEqual({ rows: 5, cols: 6 })
    expect(chooseAutoLayout(9, 1)).toEqual({ rows: 3, cols: 3 })
  })

  it('suggests small, recommended, and detailed layouts that follow image orientation', () => {
    expect(suggestLayouts(16 / 9)).toEqual([
      { label: 'Small', rows: 3, cols: 4 },
      { label: 'Recommended', rows: 5, cols: 6 },
      { label: 'Detailed', rows: 6, cols: 10 },
    ])

    expect(suggestLayouts(9 / 16)).toEqual([
      { label: 'Small', rows: 4, cols: 3 },
      { label: 'Recommended', rows: 6, cols: 5 },
      { label: 'Detailed', rows: 10, cols: 6 },
    ])
  })

  it('keeps every preset at its exact cube count', () => {
    const layouts = suggestLayouts(0.6)

    expect(layouts.map((layout) => layout.rows * layout.cols)).toEqual([12, 30, 60])
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
  it('normalizes adjacent turns without changing the cube state', () => {
    const raw = ['R', 'R', "R'", 'U']
    const normalized = normalizeMoves(raw)

    expect(normalized).toEqual(['R', 'U'])
    expect(applyMoves(solvedState(), raw)).toBe(applyMoves(solvedState(), normalized))
  })

  it('verifies all nine visible target stickers', () => {
    const target = faceColors(applyMoves(solvedState(), 'R'), 'G')

    expect(verifyBuildMoves(['R'], target, 'G')).toBe(true)
    expect(verifyBuildMoves([], target, 'G')).toBe(false)
  })

  it('generates a legal solved-state solid face without moves', async () => {
    const target: TargetFace = [
      ['R', 'R', 'R'],
      ['R', 'R', 'R'],
      ['R', 'R', 'R'],
    ]

    const generated = await generateCubeForTarget(target)

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
    })

    expect(plan.cacheStats.hits).toBe(1)
    expect(plan.cacheStats.rotationHits).toBe(1)
    expect(plan.cubes[1].duplicateOf).toBe(0)
    expect(plan.cubes.some((cube) => cube.mountRotation !== 0)).toBe(true)
  })

  it('reverses solve moves so applying build moves from solved recreates the target face', async () => {
    const knownState = applyMoves(solvedState(), ['R'])
    const target = faceColors(knownState, 'G')

    const generated = await generateCubeForTarget(target)
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

    const generated = await generateCubeForTarget(target)
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
      onProgress: (progress) => completed.push(progress.completed),
    })

    expect(completed).toEqual([1, 2])
  })
})
