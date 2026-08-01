import { memo, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import { COLOR_HEX } from '../core/cube'
import type { StickerGrid } from '../types'

const STICKER_GAP = 2

export function previewWidthFor(cols: number, stickerSize: number): string {
  const stickerColumns = cols * 3
  return `max(100%, ${stickerColumns * stickerSize + Math.max(0, stickerColumns - 1) * STICKER_GAP}px)`
}

function cubeHighlightStyle(cubeIndex: number, cubeRows: number, cols: number) {
  const row = Math.floor(cubeIndex / cols)
  const column = cubeIndex % cols
  const columnGaps = STICKER_GAP * Math.max(0, cols - 1)
  const rowGaps = STICKER_GAP * Math.max(0, cubeRows - 1)
  return {
    left: `calc(${column} * ((100% - ${columnGaps}px) / ${cols} + ${STICKER_GAP}px))`,
    top: `calc(${row} * ((100% - ${rowGaps}px) / ${cubeRows} + ${STICKER_GAP}px))`,
    width: `calc((100% - ${columnGaps}px) / ${cols})`,
    height: `calc((100% - ${rowGaps}px) / ${cubeRows})`,
  }
}

function cubeCellBoundsFor(cubeIndex: number, cubeRows: number, cols: number, rect: DOMRect) {
  const width = Math.max(1, rect.width)
  const height = Math.max(1, rect.height)
  const cubeWidth = (width - STICKER_GAP * Math.max(0, cols - 1)) / cols
  const cubeHeight = (height - STICKER_GAP * Math.max(0, cubeRows - 1)) / cubeRows
  const row = Math.floor(cubeIndex / cols)
  const column = cubeIndex % cols
  return {
    left: rect.left + column * (cubeWidth + STICKER_GAP),
    right: rect.left + column * (cubeWidth + STICKER_GAP) + cubeWidth,
    top: rect.top + row * (cubeHeight + STICKER_GAP),
    bottom: rect.top + row * (cubeHeight + STICKER_GAP) + cubeHeight,
  }
}

function StickerGridPreviewComponent({
  grid,
  cols,
  rows,
  selectedCubeIndex = null,
  onSelectCube,
  label = 'Closest Rubik color mosaic preview',
}: {
  grid: StickerGrid
  cols: number
  rows?: number
  selectedCubeIndex?: number | null
  onSelectCube?: (cubeIndex: number) => void
  label?: string
}) {
  const gridRows = Math.max(1, grid.length / 3)
  const cubeRows = rows ?? gridRows
  const totalCubes = cubeRows * cols
  const stickerSize = totalCubes >= 1200 ? 4 : totalCubes >= 400 ? 6 : totalCubes >= 120 ? 8 : 12
  const stickerColumns = cols * 3
  const previewWidth = previewWidthFor(cols, stickerSize)
  const isInteractive = Boolean(onSelectCube && rows)
  const [focusedCubeIndex, setFocusedCubeIndex] = useState(0)
  const stickerScrollRef = useRef<HTMLDivElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (selectedCubeIndex === null || selectedCubeIndex >= totalCubes) return
    setFocusedCubeIndex(selectedCubeIndex)
  }, [selectedCubeIndex, totalCubes])

  useEffect(() => {
    setFocusedCubeIndex((current) => Math.min(current, Math.max(0, totalCubes - 1)))
  }, [totalCubes])

  useEffect(() => {
    if (!isInteractive) return
    const scroll = stickerScrollRef.current
    const overlay = overlayRef.current
    if (!scroll || !overlay) return

    const cell = cubeCellBoundsFor(focusedCubeIndex, cubeRows, cols, overlay.getBoundingClientRect())
    const viewport = scroll.getBoundingClientRect()
    if (cell.left < viewport.left) {
      scroll.scrollLeft -= viewport.left - cell.left
    } else if (cell.right > viewport.right) {
      scroll.scrollLeft += cell.right - viewport.right
    }
  }, [cols, cubeRows, focusedCubeIndex, isInteractive])

  function cubeIndexAtPoint(clientX: number, clientY: number): number {
    const overlay = overlayRef.current
    if (!overlay || totalCubes === 0) return focusedCubeIndex
    const rect = overlay.getBoundingClientRect()
    const width = Math.max(1, rect.width)
    const height = Math.max(1, rect.height)
    const cubeWidth = (width - STICKER_GAP * Math.max(0, cols - 1)) / cols
    const cubeHeight = (height - STICKER_GAP * Math.max(0, cubeRows - 1)) / cubeRows
    const x = Math.max(0, Math.min(width - 0.001, clientX - rect.left))
    const y = Math.max(0, Math.min(height - 0.001, clientY - rect.top))
    const column = Math.min(cols - 1, Math.floor(x / Math.max(1, cubeWidth + STICKER_GAP)))
    const row = Math.min(cubeRows - 1, Math.floor(y / Math.max(1, cubeHeight + STICKER_GAP)))
    return Math.min(totalCubes - 1, row * cols + column)
  }

  function moveCubeFocus(cubeIndex: number, key: string, event: KeyboardEvent<HTMLButtonElement>) {
    const currentRow = Math.floor(cubeIndex / cols)
    const currentColumn = cubeIndex % cols
    let nextRow = currentRow
    let nextColumn = currentColumn

    if (key === 'ArrowUp') nextRow -= 1
    if (key === 'ArrowDown') nextRow += 1
    if (key === 'ArrowLeft') nextColumn -= 1
    if (key === 'ArrowRight') nextColumn += 1
    if (key === 'Home') nextColumn = 0
    if (key === 'End') nextColumn = cols - 1

    if (nextRow < 0 || nextRow >= cubeRows || nextColumn < 0 || nextColumn >= cols) return

    const nextIndex = nextRow * cols + nextColumn
    if (nextIndex === cubeIndex || nextIndex >= totalCubes) return
    event.preventDefault()
    setFocusedCubeIndex(nextIndex)
  }

  function selectCube(cubeIndex: number) {
    setFocusedCubeIndex(cubeIndex)
    onSelectCube?.(cubeIndex)
  }

  function handleOverlayClick(event: MouseEvent<HTMLButtonElement>) {
    const cubeIndex = event.detail === 0 ? focusedCubeIndex : cubeIndexAtPoint(event.clientX, event.clientY)
    selectCube(cubeIndex)
  }

  return (
    <div ref={stickerScrollRef} className="sticker-scroll">
      <div className="sticker-preview-canvas" style={{ width: previewWidth }}>
        <div
          className="sticker-preview"
          style={{
            gap: STICKER_GAP,
            gridTemplateColumns: `repeat(${stickerColumns}, minmax(${stickerSize}px, 1fr))`,
          }}
          aria-label={label}
        >
          {grid.flatMap((row, rowIndex) =>
            row.map((color, colIndex) => (
              <span
                key={`${rowIndex}-${colIndex}`}
                className="sticker"
                style={{ background: COLOR_HEX[color] }}
                title={`${color} sticker`}
              />
            )),
          )}
        </div>
        {isInteractive ? (
          <div
            ref={overlayRef}
            className="cube-selection-overlay"
            aria-label="Select a cube from the mosaic. Use arrow keys to move."
          >
            <button
              type="button"
              className={selectedCubeIndex === focusedCubeIndex ? 'cube-selection-button selected' : 'cube-selection-button'}
              tabIndex={0}
              aria-label={`Select cube ${focusedCubeIndex + 1}. Use arrow keys to move.`}
              aria-pressed={selectedCubeIndex === focusedCubeIndex}
              title={`Cube ${focusedCubeIndex + 1}`}
              onClick={handleOverlayClick}
              onKeyDown={(event) => moveCubeFocus(focusedCubeIndex, event.key, event)}
            >
              <span className="cube-selection-focus" style={cubeHighlightStyle(focusedCubeIndex, cubeRows, cols)} aria-hidden="true">
                <span className="cube-selection-label">{focusedCubeIndex + 1}</span>
              </span>
              {selectedCubeIndex !== null && selectedCubeIndex !== focusedCubeIndex ? (
                <span className="cube-selection-selected" style={cubeHighlightStyle(selectedCubeIndex, cubeRows, cols)} aria-hidden="true">
                  <span className="cube-selection-label">{selectedCubeIndex + 1}</span>
                </span>
              ) : null}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export const StickerGridPreview = memo(StickerGridPreviewComponent)
