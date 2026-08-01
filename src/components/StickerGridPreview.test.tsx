import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { previewWidthFor, StickerGridPreview } from './StickerGridPreview'
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

  it('includes sticker gaps in the scrollable overlay width', () => {
    expect(previewWidthFor(1, 12)).toBe('max(100%, 40px)')
  })

  it('uses the same gap for the sticker grid and cube selection overlay', () => {
    const { container } = render(<StickerGridPreview grid={face} cols={1} rows={1} onSelectCube={() => undefined} />)

    expect(container.querySelector('.sticker-preview')).toHaveStyle('gap: 2px')
    expect(container.querySelector('.cube-selection-overlay')).toHaveStyle('gap: 2px')
  })
})
