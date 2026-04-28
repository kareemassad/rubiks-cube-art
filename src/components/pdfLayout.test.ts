import { describe, expect, it } from 'vitest'
import { getPdfMosaicDimensions, getPdfMosaicStickerSize } from './pdfLayout'

describe('PDF mosaic layout', () => {
  it('keeps small mosaics readable without exceeding the sticker cap', () => {
    expect(getPdfMosaicStickerSize(5, 6)).toBe(10)
  })

  it('bounds wide mosaics to the printable width', () => {
    const dimensions = getPdfMosaicDimensions(3, 200)
    expect(dimensions.width).toBeLessThanOrEqual(500)
    expect(dimensions.height).toBeGreaterThan(0)
  })

  it('bounds tall mosaics to the printable height', () => {
    const dimensions = getPdfMosaicDimensions(200, 3)
    expect(dimensions.height).toBeLessThanOrEqual(360)
    expect(dimensions.width).toBeGreaterThan(0)
  })

  it('never collapses dense mosaics below the printable minimum', () => {
    expect(getPdfMosaicStickerSize(200, 200)).toBe(0.6)
  })
})
