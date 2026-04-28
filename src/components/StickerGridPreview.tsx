import { memo } from 'react'
import { COLOR_HEX } from '../core/cube'
import type { StickerGrid } from '../types'

function StickerGridPreviewComponent({
  grid,
  cols,
  label = 'Closest Rubik color mosaic preview',
}: {
  grid: StickerGrid
  cols: number
  label?: string
}) {
  const rows = Math.max(1, grid.length / 3)
  const totalCubes = rows * cols
  const stickerSize = totalCubes >= 1200 ? 4 : totalCubes >= 400 ? 6 : totalCubes >= 120 ? 8 : 12

  return (
    <div className="sticker-scroll">
      <div
        className="sticker-preview"
        style={{
          gridTemplateColumns: `repeat(${cols * 3}, minmax(${stickerSize}px, 1fr))`,
          width: `max(100%, ${cols * 3 * stickerSize}px)`,
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
    </div>
  )
}

export const StickerGridPreview = memo(StickerGridPreviewComponent)
