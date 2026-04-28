import {
  containDrawBox,
  cropToAspect,
  findContentCropBox,
  nearestRubikColor,
} from '../image/palette'
import type { RubikColor, StickerGrid } from '../../types'

type PreviewRequest = {
  id: number
  image: ImageBitmap
  rows: number
  cols: number
  cropToWall: boolean
}

type PreviewResponse =
  | { id: number; type: 'complete'; grid: StickerGrid }
  | { id: number; type: 'error'; message: string }

function post(response: PreviewResponse) {
  self.postMessage(response)
}

function context2d(canvas: OffscreenCanvas): OffscreenCanvasRenderingContext2D {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas 2D context is unavailable')
  return context
}

function quantizeBitmap(image: ImageBitmap, cubeRows: number, cubeCols: number, cropToWall: boolean): StickerGrid {
  const width = cubeCols * 3
  const height = cubeRows * 3
  const sourceWidth = image.width
  const sourceHeight = image.height

  const source = new OffscreenCanvas(sourceWidth, sourceHeight)
  const sourceContext = context2d(source)
  sourceContext.fillStyle = '#fff'
  sourceContext.fillRect(0, 0, sourceWidth, sourceHeight)
  sourceContext.drawImage(image, 0, 0, sourceWidth, sourceHeight)

  const sourceData = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight)
  const contentCrop = findContentCropBox(sourceData.data, sourceWidth, sourceHeight)
  const crop = cropToWall
    ? cropToAspect(contentCrop, width / height, sourceWidth, sourceHeight)
    : { sx: 0, sy: 0, sw: sourceWidth, sh: sourceHeight }

  const sample = new OffscreenCanvas(width, height)
  const sampleContext = context2d(sample)
  sampleContext.fillStyle = '#fff'
  sampleContext.fillRect(0, 0, width, height)
  if (cropToWall) {
    sampleContext.drawImage(image, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height)
  } else {
    const box = containDrawBox(sourceWidth, sourceHeight, width, height)
    sampleContext.drawImage(image, 0, 0, sourceWidth, sourceHeight, box.dx, box.dy, box.dw, box.dh)
  }

  const data = sampleContext.getImageData(0, 0, width, height).data
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

self.onmessage = (event: MessageEvent<PreviewRequest>) => {
  const { id, image, rows, cols, cropToWall } = event.data
  try {
    post({ id, type: 'complete', grid: quantizeBitmap(image, rows, cols, cropToWall) })
  } catch (error) {
    post({ id, type: 'error', message: error instanceof Error ? error.message : 'Preview worker failed.' })
  }
}
