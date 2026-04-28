import { describe, expect, it } from 'vitest'
import { findContentCropBox } from '../image/palette'

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
