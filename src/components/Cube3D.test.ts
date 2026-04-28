import { describe, expect, it } from 'vitest'
import { applyMoves, solvedState } from '../core/cube'
import { sceneAnimationReducer } from './Cube3D'

describe('Cube3D animation reducer', () => {
  it('does not drop target state updates while a turn is active', () => {
    const solved = solvedState()
    const afterR = applyMoves(solved, 'R')
    const afterRU = applyMoves(afterR, 'U')

    const animating = sceneAnimationReducer(
      { rendered: solved, turn: null, startedAt: 0, queuedState: null },
      { type: 'sync', state: afterR, now: 10 },
    )
    const queued = sceneAnimationReducer(animating, { type: 'sync', state: afterRU, now: 20 })
    const done = sceneAnimationReducer(queued, { type: 'done' })

    expect(done.rendered).toBe(afterRU)
    expect(done.turn).toBeNull()
    expect(done.queuedState).toBeNull()
  })
})
