import { memo } from 'react'
import { COLOR_HEX } from '../core/cube'
import type { StickerGrid } from '../types'

export function previewWidthFor(cols: number, stickerSize: number): string {
  const stickerColumns = cols * 3
  const stickerGap = 2
  return `max(100%, ${stickerColumns * stickerSize + Math.max(0, stickerColumns - 1) * stickerGap}px)`
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

  return (
    <div className="sticker-scroll">
      <div className="sticker-preview-canvas" style={{ width: previewWidth }}>
        <div
          className="sticker-preview"
          style={{ gridTemplateColumns: `repeat(${stickerColumns}, minmax(${stickerSize}px, 1fr))` }}
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
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${cubeRows}, minmax(0, 1fr))`,
            }}
            aria-label="Select a cube from the mosaic"
          >
            {Array.from({ length: cubeRows * cols }, (_, cubeIndex) => (
              <button
                key={cubeIndex}
                type="button"
                className={selectedCubeIndex === cubeIndex ? 'cube-selection-button selected' : 'cube-selection-button'}
                aria-label={`Select cube ${cubeIndex + 1}`}
                aria-pressed={selectedCubeIndex === cubeIndex}
                title={`Cube ${cubeIndex + 1}`}
                onClick={() => onSelectCube?.(cubeIndex)}
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
