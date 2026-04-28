import { describe, expect, it } from 'vitest'
import { buildCubeToGroupIndex, hashMosaicPlan } from '../mosaic/planIdentity'
import type { GeneratedCube, GeneratedCubeGroup, MosaicPlan, TargetFace } from '../../types'

const face: TargetFace = [
  ['W', 'W', 'W'],
  ['W', 'W', 'W'],
  ['W', 'W', 'W'],
]

function cube(overrides: Partial<GeneratedCube> = {}): GeneratedCube {
  return {
    targetFace: face,
    outputFace: face,
    solvedFace: face,
    mountRotation: 0,
    displayFace: 'W',
    faceletState: 'solved',
    solveMoves: [],
    buildMoves: [],
    score: { matched: 9, total: 9, exact: true, moveCount: 0 },
    ...overrides,
  }
}

function plan(cubes: GeneratedCube[]): MosaicPlan {
  return {
    rows: 1,
    cols: cubes.length,
    stickerGrid: [face[0], face[1], face[2]],
    cubes,
    cacheStats: { hits: 0, misses: cubes.length, rotationHits: 0 },
  }
}

describe('plan identity', () => {
  it('hashes generated output and build instructions deterministically', () => {
    const base = plan([cube()])
    const equivalent = plan([cube()])
    const different = plan([cube({ buildMoves: ['R'] })])

    expect(hashMosaicPlan(base)).toBe(hashMosaicPlan(equivalent))
    expect(hashMosaicPlan(base)).not.toBe(hashMosaicPlan(different))
  })

  it('maps each cube index to its rendered group id', () => {
    const groups: GeneratedCubeGroup[] = [
      { id: 'white', cube: cube(), indices: [0, 2] },
      { id: 'red', cube: cube({ displayFace: 'R' }), indices: [1] },
    ]

    expect(buildCubeToGroupIndex(groups)).toEqual(new Map([
      [0, 'white'],
      [1, 'red'],
      [2, 'white'],
    ]))
  })
})
