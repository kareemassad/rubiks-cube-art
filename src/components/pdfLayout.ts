const PDF_MOSAIC_MAX_WIDTH = 500
const PDF_MOSAIC_MAX_HEIGHT = 360
const PDF_MOSAIC_MAX_STICKER = 10
const PDF_MOSAIC_MIN_STICKER = 0.6

export function getPdfMosaicStickerSize(rows: number, cols: number): number {
  return Math.min(
    PDF_MOSAIC_MAX_STICKER,
    Math.max(
      PDF_MOSAIC_MIN_STICKER,
      Math.min(
        PDF_MOSAIC_MAX_WIDTH / Math.max(1, cols * 3),
        PDF_MOSAIC_MAX_HEIGHT / Math.max(1, rows * 3),
      ),
    ),
  )
}

export function getPdfMosaicDimensions(rows: number, cols: number): { width: number; height: number; stickerSize: number } {
  const stickerSize = getPdfMosaicStickerSize(rows, cols)
  return {
    width: cols * 3 * stickerSize,
    height: rows * 3 * stickerSize,
    stickerSize,
  }
}
