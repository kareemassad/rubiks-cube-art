import { generateMosaicPlanFromGrid } from '../mosaic'
import type { MosaicPlan, MosaicProgress, OptimizerOptions, StickerGrid } from '../../types'

type GenerateOptions = {
  rows: number
  cols: number
  optimizer: Partial<OptimizerOptions>
  onProgress?: (progress: MosaicProgress) => void
}

type WorkerResponse =
  | { id: number; type: 'progress'; progress: MosaicProgress }
  | { id: number; type: 'complete'; plan: MosaicPlan }
  | { id: number; type: 'error'; message: string }

let requestId = 0

export function generateMosaicPlan(
  stickerGrid: StickerGrid,
  options: GenerateOptions,
): Promise<MosaicPlan> {
  if (typeof Worker === 'undefined') {
    return generateMosaicPlanFromGrid(stickerGrid, options)
  }

  const id = ++requestId
  const worker = new Worker(new URL('./generateWorker.ts', import.meta.url), { type: 'module' })

  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== id) return
      if (event.data.type === 'progress') {
        options.onProgress?.(event.data.progress)
        return
      }
      worker.terminate()
      if (event.data.type === 'complete') {
        resolve(event.data.plan)
      } else {
        reject(new Error(event.data.message))
      }
    }

    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || 'Generation worker failed.'))
    }

    worker.postMessage({
      id,
      stickerGrid,
      rows: options.rows,
      cols: options.cols,
      optimizer: options.optimizer,
    })
  })
}
