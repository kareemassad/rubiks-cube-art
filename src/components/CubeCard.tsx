import { memo } from 'react'
import { Check } from 'lucide-react'
import { TargetFacePreview } from './TargetFacePreview'
import type { GeneratedCubeGroup } from '../types'

const CONFETTI_PIECES = Array.from({ length: 28 }, (_, index) => `confetti-${index + 1}`)

function CubeCardComponent({
  group,
  onInspectCube,
  completed,
  celebrating,
  highlighted,
  onToggleComplete,
}: {
  group: GeneratedCubeGroup
  onInspectCube: (cubeIndex: number) => void
  completed: boolean
  celebrating: boolean
  highlighted?: boolean
  onToggleComplete: (groupId: string) => void
}) {
  const cube = group.cube
  const className = [
    'cube-card',
    completed ? 'completed' : '',
    highlighted ? 'highlighted' : '',
  ].filter(Boolean).join(' ')
  return (
    <article className={className}>
      {celebrating ? (
        <div className="confetti-burst" aria-hidden="true">
          {CONFETTI_PIECES.map((id) => (
            <span key={id} />
          ))}
        </div>
      ) : null}
      <div className="cube-card-main">
        <div className="cube-card-title">
          <span>{group.indices.length}x Face</span>
        </div>
        <button
          className={completed ? 'complete-corner done' : 'complete-corner'}
          onClick={() => onToggleComplete(group.id)}
          aria-label={completed ? 'Mark face incomplete' : 'Mark face complete'}
          title={completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {completed ? <Check size={16} /> : null}
        </button>
        <div className="cube-card-visuals">
          <button className="face-inspect" onClick={() => onInspectCube(group.indices[0])} aria-label={`Open instructions for ${group.indices.length} matching faces`}>
            <TargetFacePreview targetFace={cube.outputFace} className="output-exact" />
          </button>
        </div>
      </div>
    </article>
  )
}

export const CubeCard = memo(CubeCardComponent)
