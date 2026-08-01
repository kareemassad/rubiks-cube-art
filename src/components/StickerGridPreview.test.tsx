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

  it('keeps one cube tabbable and moves focus with arrow keys', () => {
    const onSelectCube = vi.fn()
    const grid: StickerGrid = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 'W'))
    render(<StickerGridPreview grid={grid} cols={2} rows={2} onSelectCube={onSelectCube} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveAttribute('tabindex', '0')
    expect(buttons.slice(1).every((button) => button.getAttribute('tabindex') === '-1')).toBe(true)

    buttons[0].focus()
    fireEvent.keyDown(buttons[0], { key: 'ArrowRight' })

    expect(buttons[1]).toHaveFocus()
    expect(buttons[1]).toHaveAttribute('tabindex', '0')
    expect(buttons[0]).toHaveAttribute('tabindex', '-1')
    expect(onSelectCube).not.toHaveBeenCalled()
  })

  it('includes sticker gaps in the scrollable overlay width', () => {
    expect(previewWidthFor(1, 12)).toBe('max(100%, 40px)')
  })

  it('uses the same gap for the sticker grid and cube selection overlay', () => {
    const { container } = render(<StickerGridPreview grid={face} cols={1} rows={1} onSelectCube={() => undefined} />)

    expect(container.querySelector('.sticker-preview')).toHaveStyle('gap: 2px')
    expect(container.querySelector('.cube-selection-overlay')).toHaveStyle('gap: 2px')
  })

  it('uses cube-sized tracks for the selection overlay', () => {
    const { container } = render(
      <StickerGridPreview
        grid={[
          ['W', 'W', 'W', 'W', 'W', 'W'],
          ['W', 'W', 'W', 'W', 'W', 'W'],
          ['W', 'W', 'W', 'W', 'W', 'W'],
        ]}
        cols={2}
        rows={1}
        onSelectCube={() => undefined}
      />,
    )

    expect(container.querySelector('.cube-selection-overlay')).toHaveStyle({
      gridTemplateColumns: 'repeat(2, minmax(40px, 1fr))',
      gridTemplateRows: 'repeat(1, minmax(40px, 1fr))',
    })
  })
})
