import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateMosaicPlan } from './generateClient'
import type { StickerGrid } from '../../types'

const face: StickerGrid = [
  ['W', 'W', 'W'],
  ['W', 'W', 'W'],
  ['W', 'W', 'W'],
]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('generateMosaicPlan', () => {
  it('falls back to main-thread generation when the worker cannot run', async () => {
    class FailingWorker {
      onerror: ((event: { message?: string }) => void) | null = null
      onmessage: ((event: MessageEvent) => void) | null = null

      postMessage() {
        globalThis.setTimeout(() => this.onerror?.({ message: 'Worker unavailable' }), 0)
      }

      terminate() {}
    }

    vi.stubGlobal('Worker', FailingWorker)

    const plan = await generateMosaicPlan(face, { rows: 1, cols: 1 })

    expect(plan.cubes).toHaveLength(1)
    expect(plan.cubes[0].score.exact).toBe(true)
  })
})
