import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StickerGridPreview } from './StickerGridPreview'
import type { StickerGrid } from '../types'

const face: StickerGrid = [
  ['W', 'W', 'W'],
  ['W', 'W', 'W'],
  ['W', 'W', 'W'],
]

describe('StickerGridPreview', () => {
  it('selects a cube region from the mosaic', () => {
    const onSelectCube = vi.fn()

    render(<StickerGridPreview grid={face} cols={1} rows={1} onSelectCube={onSelectCube} />)

    fireEvent.click(screen.getByRole('button', { name: /select cube 1/i }))

    expect(onSelectCube).toHaveBeenCalledWith(0)
  })
})
