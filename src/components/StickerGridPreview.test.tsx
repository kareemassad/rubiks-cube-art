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

  it('uses one accessible picker control and maps pointer clicks to cube cells', () => {
    const onSelectCube = vi.fn()
    const grid: StickerGrid = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 'W'))
    render(<StickerGridPreview grid={grid} cols={2} rows={2} onSelectCube={onSelectCube} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAttribute('tabindex', '0')
    expect(buttons[0]).toHaveAccessibleName('Select cube 1. Use arrow keys to move.')

    buttons[0].focus()
    fireEvent.keyDown(buttons[0], { key: 'ArrowRight' })

    expect(buttons[0]).toHaveFocus()
    expect(buttons[0]).toHaveAccessibleName('Select cube 2. Use arrow keys to move.')
    expect(onSelectCube).not.toHaveBeenCalled()

    const overlay = document.querySelector('.cube-selection-overlay') as HTMLDivElement
    vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue({
      bottom: 200,
      height: 200,
      left: 0,
      right: 200,
      top: 0,
      width: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)
    fireEvent.click(buttons[0], { detail: 1, clientX: 150, clientY: 50 })

    expect(onSelectCube).toHaveBeenCalledWith(1)
  })

  it('includes sticker gaps in the scrollable overlay width', () => {
    expect(previewWidthFor(1, 12)).toBe('max(100%, 40px)')
  })

  it('uses gap-aware highlight geometry for the selection overlay', () => {
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

    expect(container.querySelector('.sticker-preview')).toHaveStyle('gap: 2px')
    expect(container.querySelector('.cube-selection-focus')).toHaveStyle({
      width: 'calc((100% - 2px) / 2)',
      height: 'calc((100% - 0px) / 1)',
    })
  })

  it('scrolls a keyboard-selected cube into the horizontal viewport', () => {
    const grid: StickerGrid = [
      ['W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W'],
      ['W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W'],
      ['W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W'],
    ]
    render(<StickerGridPreview grid={grid} cols={3} rows={1} onSelectCube={() => undefined} />)

    const scroll = document.querySelector('.sticker-scroll') as HTMLDivElement
    const overlay = document.querySelector('.cube-selection-overlay') as HTMLDivElement
    Object.defineProperty(scroll, 'scrollLeft', { configurable: true, writable: true, value: 0 })
    vi.spyOn(scroll, 'getBoundingClientRect').mockReturnValue({
      bottom: 100,
      height: 100,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)
    vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue({
      bottom: 40,
      height: 40,
      left: 0,
      right: 300,
      top: 0,
      width: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)

    const button = screen.getByRole('button', { name: /select cube 1/i })
    button.focus()
    fireEvent.keyDown(button, { key: 'ArrowRight' })

    expect(scroll.scrollLeft).toBeGreaterThan(0)
  })

  it('moves vertically and keeps the focused cube visible in a tall single-column mosaic', () => {
    const grid: StickerGrid = [
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
    ]
    const { container } = render(<StickerGridPreview grid={grid} cols={1} rows={3} onSelectCube={() => undefined} />)
    const button = screen.getByRole('button', { name: /select cube 1/i })
    const focusedCell = container.querySelector('.cube-selection-focus') as HTMLSpanElement
    const scrollIntoView = vi.fn()
    focusedCell.scrollIntoView = scrollIntoView

    fireEvent.keyDown(button, { key: 'ArrowDown' })

    expect(button).toHaveAccessibleName('Select cube 2. Use arrow keys to move.')
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' })

    scrollIntoView.mockClear()
    fireEvent.keyDown(button, { key: 'ArrowUp' })

    expect(button).toHaveAccessibleName('Select cube 1. Use arrow keys to move.')
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' })
  })

  it('shows the hovered cube without changing the focused cube', () => {
    const grid: StickerGrid = Array.from({ length: 6 }, () => Array.from({ length: 6 }, () => 'W'))
    const { container } = render(<StickerGridPreview grid={grid} cols={2} rows={2} onSelectCube={() => undefined} />)
    const overlay = container.querySelector('.cube-selection-overlay') as HTMLDivElement
    vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue({
      bottom: 200,
      height: 200,
      left: 0,
      right: 200,
      top: 0,
      width: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect)

    const button = screen.getByRole('button', { name: /select cube 1/i })
    fireEvent.pointerMove(button, { clientX: 150, clientY: 50, pointerType: 'mouse' })

    const hover = container.querySelector('.cube-selection-hover')
    expect(hover).toBeInTheDocument()
    expect(hover).toHaveAttribute('data-visible', 'true')
    expect(hover).toHaveStyle('left: calc(1 * ((100% - 2px) / 2 + 2px))')
    expect(button).toHaveAccessibleName('Select cube 1. Use arrow keys to move.')

    fireEvent.pointerLeave(button)

    expect(hover).toHaveAttribute('data-visible', 'false')
  })
})
