import { describe, expect, it, vi } from 'vitest'
import { readCompletedGroups, writeCompletedGroups } from '../storage/completionStorage'

describe('completion storage', () => {
  it('falls back to an empty set when stored JSON is corrupt', () => {
    const storage = {
      getItem: vi.fn(() => '{not-json'),
      setItem: vi.fn(),
    } as unknown as Storage

    expect(readCompletedGroups(storage, 'plan-1')).toEqual(new Set())
  })

  it('ignores storage write failures', () => {
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error('quota exceeded')
      }),
    } as unknown as Storage

    expect(() => writeCompletedGroups(storage, 'plan-1', new Set(['group-a']))).not.toThrow()
  })
})
