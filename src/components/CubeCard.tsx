import { memo } from 'react'
import { Check } from 'lucide-react'
import { TargetFacePreview } from './TargetFacePreview'
import type { GeneratedCube } from '../types'

const CONFETTI_PIECES = Array.from({ length: 28 }, (_, index) => `confetti-${index + 1}`)

function CubeCardComponent({
  cube,
  cubeIndex,
  positionLabel,
  id,
  onInspectCube,
  completed,
  celebrating,
  highlighted,
  onToggleComplete,
}: {
  cube: GeneratedCube
  cubeIndex: number
  positionLabel: string
  id: string
  onInspectCube: (cubeIndex: number) => void
  completed: boolean
  celebrating: boolean
  highlighted?: boolean
  onToggleComplete: (cubeIndex: number) => void
}) {
  const className = [
    'cube-card',
    completed ? 'completed' : '',
    highlighted ? 'highlighted' : '',
  ].filter(Boolean).join(' ')
  return (
    <article id={id} className={className}>
      {celebrating ? (
        <div className="confetti-burst" aria-hidden="true">
          {CONFETTI_PIECES.map((id) => (
            <span key={id} />
          ))}
        </div>
      ) : null}
      <div className="cube-card-main">
        <div className="cube-card-title">
          <span>Cube {cubeIndex + 1}</span>
          <small>{positionLabel}</small>
        </div>
        <button
          className={completed ? 'complete-corner done' : 'complete-corner'}
          onClick={() => onToggleComplete(cubeIndex)}
          aria-label={completed ? `Mark cube ${cubeIndex + 1} incomplete` : `Mark cube ${cubeIndex + 1} complete`}
          title={completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {completed ? <Check size={16} /> : null}
        </button>
        <div className="cube-card-visuals">
          <button className="face-inspect" onClick={() => onInspectCube(cubeIndex)} aria-label={`View instructions for cube ${cubeIndex + 1}`}>
            <TargetFacePreview targetFace={cube.outputFace} className="output-exact" />
            <span className="face-inspect-label">View steps</span>
          </button>
        </div>
      </div>
    </article>
  )
}

export const CubeCard = memo(CubeCardComponent)
