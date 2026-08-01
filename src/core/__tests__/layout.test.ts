import { describe, expect, it } from 'vitest'
import {
  canGenerateInstructions,
  chooseLayoutForCubeCount,
  clampColumnsForRows,
  clampCubeDimension,
  clampRowsForColumns,
  layoutShapeMessage,
  layoutLimitMessage,
  MAX_GENERATION_CUBES,
  maxColumnsForRows,
  maxRowsForColumns,
} from '../layout'

describe('layout limits', () => {
  it('clamps pathological dimensions to a bounded preview range', () => {
    expect(clampCubeDimension(3)).toBe(3)
    expect(clampCubeDimension(3000)).toBe(MAX_GENERATION_CUBES)
    expect(clampCubeDimension(0)).toBe(1)
    expect(clampCubeDimension(Number.NaN)).toBe(1)
  })

  it('allows long strips but blocks huge instruction jobs', () => {
    expect(canGenerateInstructions(3, 200)).toBe(true)
    expect(canGenerateInstructions(200, 3)).toBe(true)
    expect(canGenerateInstructions(40, 40)).toBe(true)
    expect(canGenerateInstructions(50, 40)).toBe(true)
    expect(canGenerateInstructions(51, 40)).toBe(false)
    expect(layoutLimitMessage(51, 40)).toContain('2040 cubes is too many')
  })

  it('derives complementary row and column limits from the exact instruction budget', () => {
    expect(maxColumnsForRows(3)).toBe(666)
    expect(maxRowsForColumns(3)).toBe(666)
    expect(maxColumnsForRows(40)).toBe(50)
    expect(maxRowsForColumns(40)).toBe(50)
    expect(clampColumnsForRows(200, 3)).toBe(200)
    expect(clampRowsForColumns(200, 3)).toBe(200)
    expect(clampColumnsForRows(200, 200)).toBe(10)
  })

  it('chooses an aspect-aware layout from a cube count', () => {
    expect(chooseLayoutForCubeCount(30, 1.2)).toEqual({ rows: 5, cols: 6 })
    expect(chooseLayoutForCubeCount(2000, 1)).toEqual({ rows: 50, cols: 40 })
    expect(chooseLayoutForCubeCount(3000, 2)).toEqual({ rows: 40, cols: 50 })
  })

  it('keeps extreme portrait aspects eligible for the narrowest exact layout', () => {
    expect(chooseLayoutForCubeCount(2000, 0.0001)).toEqual({ rows: 2000, cols: 1 })
  })

  it('keeps the target cube count when the image is portrait', () => {
    const layout = chooseLayoutForCubeCount(4, 0.6)

    expect(layout).toEqual({ rows: 2, cols: 2 })
    expect(layout.rows * layout.cols).toBe(4)
  })

  it('explains when an exact count requires a single-row or single-column wall', () => {
    expect(layoutShapeMessage(13, { rows: 1, cols: 13 })).toContain('exact 13-cube layout')
    expect(layoutShapeMessage(6, { rows: 1, cols: 6 })).toContain('for this image shape')
    expect(layoutShapeMessage(30, { rows: 5, cols: 6 })).toBeNull()
  })
})
