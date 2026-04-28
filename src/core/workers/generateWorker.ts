import { generateMosaicPlanFromGrid } from '../mosaic'
import type { MosaicPlan, MosaicProgress, OptimizerOptions, StickerGrid } from '../../types'

type GenerateRequest = {
  id: number
  stickerGrid: StickerGrid
  rows: number
  cols: number
  optimizer: Partial<OptimizerOptions>
}

type WorkerResponse =
  | { id: number; type: 'progress'; progress: MosaicProgress }
  | { id: number; type: 'complete'; plan: MosaicPlan }
  | { id: number; type: 'error'; message: string }

function post(response: WorkerResponse) {
  self.postMessage(response)
}

self.onmessage = async (event: MessageEvent<GenerateRequest>) => {
  const { id, stickerGrid, rows, cols, optimizer } = event.data

  try {
    const plan = await generateMosaicPlanFromGrid(stickerGrid, {
      rows,
      cols,
      optimizer,
      onProgress: (progress) => post({ id, type: 'progress', progress }),
    })
    post({ id, type: 'complete', plan })
  } catch (error) {
    post({ id, type: 'error', message: error instanceof Error ? error.message : 'Generation failed.' })
  }
}
