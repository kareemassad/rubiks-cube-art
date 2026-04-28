import { memo } from 'react'
import { COLOR_HEX } from '../core/cube'
import type { TargetFace } from '../types'

const TARGET_FACE_CELLS = [
  { id: 'top-left', row: 0, col: 0 },
  { id: 'top-center', row: 0, col: 1 },
  { id: 'top-right', row: 0, col: 2 },
  { id: 'middle-left', row: 1, col: 0 },
  { id: 'middle-center', row: 1, col: 1 },
  { id: 'middle-right', row: 1, col: 2 },
  { id: 'bottom-left', row: 2, col: 0 },
  { id: 'bottom-center', row: 2, col: 1 },
  { id: 'bottom-right', row: 2, col: 2 },
] as const

function TargetFacePreviewComponent({ targetFace, className = '' }: { targetFace: TargetFace; className?: string }) {
  return (
    <div className={`target-face ${className}`}>
      {TARGET_FACE_CELLS.map((cell) => (
        <span key={cell.id} style={{ background: COLOR_HEX[targetFace[cell.row][cell.col]] }} />
      ))}
    </div>
  )
}

export const TargetFacePreview = memo(TargetFacePreviewComponent)
