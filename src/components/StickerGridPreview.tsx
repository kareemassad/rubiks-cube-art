import { memo, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { COLOR_HEX } from '../core/cube'
import type { StickerGrid } from '../types'

const STICKER_GAP = 2

export function previewWidthFor(cols: number, stickerSize: number): string {
  const stickerColumns = cols * 3
  return `max(100%, ${stickerColumns * stickerSize + Math.max(0, stickerColumns - 1) * STICKER_GAP}px)`
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
  const cubeTrackSize = stickerSize * 3 + STICKER_GAP * 2
  const previewWidth = previewWidthFor(cols, stickerSize)
  const isInteractive = Boolean(onSelectCube && rows)
  const [focusedCubeIndex, setFocusedCubeIndex] = useState(0)
  const cubeButtonRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    if (selectedCubeIndex === null || selectedCubeIndex >= totalCubes) return
    setFocusedCubeIndex(selectedCubeIndex)
  }, [selectedCubeIndex, totalCubes])

  useEffect(() => {
    setFocusedCubeIndex((current) => Math.min(current, Math.max(0, totalCubes - 1)))
  }, [totalCubes])

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
    cubeButtonRefs.current[nextIndex]?.focus()
  }

  function selectCube(cubeIndex: number) {
    setFocusedCubeIndex(cubeIndex)
    onSelectCube?.(cubeIndex)
  }

  return (
    <div className="sticker-scroll">
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
            className="cube-selection-overlay"
            style={{
              gap: STICKER_GAP,
              gridTemplateColumns: `repeat(${cols}, minmax(${cubeTrackSize}px, 1fr))`,
              gridTemplateRows: `repeat(${cubeRows}, minmax(${cubeTrackSize}px, 1fr))`,
            }}
            aria-label="Select a cube from the mosaic. Use arrow keys to move."
          >
            {Array.from({ length: cubeRows * cols }, (_, cubeIndex) => (
              <button
                key={cubeIndex}
                type="button"
                className={selectedCubeIndex === cubeIndex ? 'cube-selection-button selected' : 'cube-selection-button'}
                ref={(element) => {
                  cubeButtonRefs.current[cubeIndex] = element
                }}
                tabIndex={cubeIndex === focusedCubeIndex ? 0 : -1}
                aria-label={`Select cube ${cubeIndex + 1}`}
                aria-pressed={selectedCubeIndex === cubeIndex}
                title={`Cube ${cubeIndex + 1}`}
                onFocus={() => setFocusedCubeIndex(cubeIndex)}
                onClick={() => selectCube(cubeIndex)}
                onKeyDown={(event) => moveCubeFocus(cubeIndex, event.key, event)}
              >
                <span>{cubeIndex + 1}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export const StickerGridPreview = memo(StickerGridPreviewComponent)
