import { generateMosaicPlanFromGrid } from '../mosaic'
import type { MosaicPlan, MosaicProgress, StickerGrid } from '../../types'

type GenerateOptions = {
  rows: number
  cols: number
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
  let worker: Worker
  try {
    worker = new Worker(new URL('./generateWorker.ts', import.meta.url), { type: 'module' })
  } catch {
    return generateMosaicPlanFromGrid(stickerGrid, options)
  }

  return new Promise((resolve, reject) => {
    let settled = false

    function fallbackToMainThread() {
      if (settled) return
      settled = true
      worker.terminate()
      generateMosaicPlanFromGrid(stickerGrid, options).then(resolve, reject)
    }

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (settled) return
      if (event.data.id !== id) return
      if (event.data.type === 'progress') {
        options.onProgress?.(event.data.progress)
        return
      }
      settled = true
      worker.terminate()
      if (event.data.type === 'complete') {
        resolve(event.data.plan)
      } else {
        reject(new Error(event.data.message))
      }
    }

    worker.onerror = () => fallbackToMainThread()

    worker.postMessage({
      id,
      stickerGrid,
      rows: options.rows,
      cols: options.cols,
    })
  })
}
