import type { RubikColor, StickerGrid } from '../../types'

type Rgb = { r: number; g: number; b: number }
type CropBox = { sx: number; sy: number; sw: number; sh: number }
export type QuantizeOptions = {
  cropToWall?: boolean
}

export const MAX_PREVIEW_SOURCE_DIMENSION = 1600

const RUBIK_PALETTE: Readonly<Record<RubikColor, Rgb>> = {
  W: { r: 248, g: 250, b: 252 },
  Y: { r: 255, g: 213, b: 0 },
  R: { r: 193, g: 18, b: 31 },
  O: { r: 247, g: 127, b: 0 },
  B: { r: 0, g: 87, b: 184 },
  G: { r: 10, g: 143, b: 67 },
}

const COLORS = Object.keys(RUBIK_PALETTE) as RubikColor[]

function distance(a: Rgb, b: Rgb): number {
  const r = a.r - b.r
  const g = a.g - b.g
  const blue = a.b - b.b
  return r * r + g * g + blue * blue
}

export function nearestRubikColor(rgb: Rgb): RubikColor {
  let best = COLORS[0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (const color of COLORS) {
    const next = distance(rgb, RUBIK_PALETTE[color])
    if (next < bestDistance) {
      best = color
      bestDistance = next
    }
  }
  return best
}

function isMostlyWhite(r: number, g: number, b: number, a: number): boolean {
  if (a < 16) return true
  return r > 235 && g > 235 && b > 235 && Math.max(r, g, b) - Math.min(r, g, b) < 24
}

export function findContentCropBox(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  paddingRatio = 0.06,
): CropBox {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      if (!isMostlyWhite(data[index], data[index + 1], data[index + 2], data[index + 3])) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (maxX < minX || maxY < minY) return { sx: 0, sy: 0, sw: width, sh: height }

  const pad = Math.round(Math.max(maxX - minX + 1, maxY - minY + 1) * paddingRatio)
  const sx = Math.max(0, minX - pad)
  const sy = Math.max(0, minY - pad)
  const ex = Math.min(width, maxX + pad + 1)
  const ey = Math.min(height, maxY + pad + 1)

  return { sx, sy, sw: ex - sx, sh: ey - sy }
}

export function cropToAspect(crop: CropBox, targetAspect: number, sourceWidth: number, sourceHeight: number): CropBox {
  const cropAspect = crop.sw / crop.sh
  if (Math.abs(cropAspect - targetAspect) < 0.001) return crop

  if (cropAspect > targetAspect) {
    const nextWidth = Math.round(crop.sh * targetAspect)
    const sx = Math.max(0, Math.min(sourceWidth - nextWidth, crop.sx + Math.round((crop.sw - nextWidth) / 2)))
    return { sx, sy: crop.sy, sw: nextWidth, sh: crop.sh }
  }

  const nextHeight = Math.round(crop.sw / targetAspect)
  const sy = Math.max(0, Math.min(sourceHeight - nextHeight, crop.sy + Math.round((crop.sh - nextHeight) / 2)))
  return { sx: crop.sx, sy, sw: crop.sw, sh: nextHeight }
}

export function containDrawBox(sourceWidth: number, sourceHeight: number, targetWidth: number, targetHeight: number) {
  const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight)
  const dw = Math.max(1, Math.round(sourceWidth * scale))
  const dh = Math.max(1, Math.round(sourceHeight * scale))
  return {
    dx: Math.round((targetWidth - dw) / 2),
    dy: Math.round((targetHeight - dh) / 2),
    dw,
    dh,
  }
}

export function previewSourceSize(sourceWidth: number, sourceHeight: number, minimumWidth = 1, minimumHeight = 1) {
  const safeWidth = Math.max(1, sourceWidth)
  const safeHeight = Math.max(1, sourceHeight)
  const requiredWidth = Math.min(safeWidth, Math.max(1, Math.round(minimumWidth)))
  const requiredHeight = Math.min(safeHeight, Math.max(1, Math.round(minimumHeight)))
  const minimumScale = Math.max(requiredWidth / safeWidth, requiredHeight / safeHeight)
  const cappedScale = Math.min(1, MAX_PREVIEW_SOURCE_DIMENSION / safeWidth, MAX_PREVIEW_SOURCE_DIMENSION / safeHeight)
  const scale = Math.max(minimumScale, cappedScale)
  return {
    width: Math.max(requiredWidth, Math.max(1, Math.round(safeWidth * scale))),
    height: Math.max(requiredHeight, Math.max(1, Math.round(safeHeight * scale))),
  }
}

export async function quantizeImage(
  image: HTMLImageElement | ImageBitmap,
  cubeRows: number,
  cubeCols: number,
  options: QuantizeOptions = {},
): Promise<StickerGrid> {
  const width = cubeCols * 3
  const height = cubeRows * 3
  const canvas = document.createElement('canvas')
  const originalWidth = 'naturalWidth' in image ? image.naturalWidth : image.width
  const originalHeight = 'naturalHeight' in image ? image.naturalHeight : image.height
  const sourceSize = previewSourceSize(originalWidth, originalHeight, width, height)
  const sourceWidth = sourceSize.width
  const sourceHeight = sourceSize.height
  canvas.width = sourceWidth
  canvas.height = sourceHeight
  const sourceCtx = canvas.getContext('2d', { willReadFrequently: true })
  if (!sourceCtx) throw new Error('Canvas 2D context is unavailable')

  sourceCtx.fillStyle = '#fff'
  sourceCtx.fillRect(0, 0, sourceWidth, sourceHeight)
  sourceCtx.drawImage(image, 0, 0, sourceWidth, sourceHeight)
  const sourceData = sourceCtx.getImageData(0, 0, sourceWidth, sourceHeight)
  const contentCrop = findContentCropBox(sourceData.data, sourceWidth, sourceHeight)
  const crop = options.cropToWall ?? true
    ? cropToAspect(contentCrop, width / height, sourceWidth, sourceHeight)
    : { sx: 0, sy: 0, sw: sourceWidth, sh: sourceHeight }

  const sample = document.createElement('canvas')
  sample.width = width
  sample.height = height
  const ctx = sample.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D context is unavailable')

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  if (options.cropToWall ?? true) {
    ctx.drawImage(canvas, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height)
  } else {
    const box = containDrawBox(sourceWidth, sourceHeight, width, height)
    ctx.drawImage(canvas, 0, 0, sourceWidth, sourceHeight, box.dx, box.dy, box.dw, box.dh)
  }
  const data = ctx.getImageData(0, 0, width, height).data
  const grid: StickerGrid = []

  for (let y = 0; y < height; y++) {
    const row: RubikColor[] = []
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      row.push(nearestRubikColor({ r: data[index], g: data[index + 1], b: data[index + 2] }))
    }
    grid.push(row)
  }

  return grid
}
