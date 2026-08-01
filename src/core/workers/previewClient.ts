import { quantizeImage } from '../image/palette'
import type { QuantizeOptions } from '../image/palette'
import type { StickerGrid } from '../../types'

type PreviewResponse =
  | { id: number; type: 'complete'; grid: StickerGrid }
  | { id: number; type: 'error'; message: string }

let requestId = 0

export function quantizeImagePreview(
  image: HTMLImageElement | ImageBitmap,
  rows: number,
  cols: number,
  options: QuantizeOptions = {},
): Promise<StickerGrid> {
  if (
    typeof Worker === 'undefined' ||
    typeof ImageBitmap === 'undefined' ||
    typeof OffscreenCanvas === 'undefined' ||
    !(image instanceof ImageBitmap)
  ) {
    return quantizeImage(image, rows, cols, options)
  }

  const id = ++requestId
  const worker = new Worker(new URL('./previewWorker.ts', import.meta.url), { type: 'module' })

  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<PreviewResponse>) => {
      if (event.data.id !== id) return
      worker.terminate()
      if (event.data.type === 'complete') {
        resolve(event.data.grid)
      } else {
        reject(new Error(event.data.message))
      }
    }

    worker.onerror = () => {
      worker.terminate()
      quantizeImage(image, rows, cols, options).then(resolve, reject)
    }

    try {
      worker.postMessage({
        id,
        image,
        rows,
        cols,
        cropToWall: options.cropToWall ?? true,
        maxSourceDimension: options.maxSourceDimension,
      })
    } catch {
      worker.terminate()
      quantizeImage(image, rows, cols, options).then(resolve, reject)
    }
  })
}
