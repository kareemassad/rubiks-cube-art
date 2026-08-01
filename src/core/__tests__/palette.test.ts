import { describe, expect, it } from 'vitest'
import { cropToAspect, findContentCropBox, previewSourceSize } from '../image/palette'

describe('image crop detection', () => {
  it('crops mostly-white borders around visible content', () => {
    const width = 5
    const height = 5
    const data = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = 255
    }
    const center = (2 * width + 2) * 4
    data[center] = 193
    data[center + 1] = 18
    data[center + 2] = 31

    expect(findContentCropBox(data, width, height, 0)).toEqual({ sx: 2, sy: 2, sw: 1, sh: 1 })
  })

  it('keeps the full image when there is no non-white content', () => {
    const data = new Uint8ClampedArray(2 * 2 * 4)
    data.fill(255)

    expect(findContentCropBox(data, 2, 2)).toEqual({ sx: 0, sy: 0, sw: 2, sh: 2 })
  })
})

describe('preview source sizing', () => {
  it('does not upscale small images', () => {
    expect(previewSourceSize(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('caps large images while preserving their aspect ratio', () => {
    expect(previewSourceSize(4000, 2000)).toEqual({ width: 1600, height: 800 })
  })

  it('does not downscale below the requested output dimensions', () => {
    expect(previewSourceSize(4000, 2000, 3000, 1500)).toEqual({ width: 3000, height: 1500 })
    expect(previewSourceSize(10000, 100, 6000, 3).width).toBeGreaterThanOrEqual(6000)
  })

  it('can preserve the original source size for final generation', () => {
    expect(previewSourceSize(4000, 2000, 1, 1, Number.POSITIVE_INFINITY)).toEqual({ width: 4000, height: 2000 })
  })
})

describe('aspect crop bounds', () => {
  it('keeps extreme target ratios at least one pixel high', () => {
    expect(cropToAspect({ sx: 0, sy: 0, sw: 1, sh: 1 }, 2000, 1, 1)).toEqual({ sx: 0, sy: 0, sw: 1, sh: 1 })
  })
})
