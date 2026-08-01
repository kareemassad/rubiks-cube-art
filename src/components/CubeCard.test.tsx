import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CubeCard } from './CubeCard'
import type { GeneratedCube, TargetFace } from '../types'

const face: TargetFace = [
  ['W', 'W', 'W'],
  ['W', 'W', 'W'],
  ['W', 'W', 'W'],
]

const cube: GeneratedCube = {
  targetFace: face,
  outputFace: face,
  solvedFace: face,
  mountRotation: 0,
  displayFace: 'W',
  faceletState: 'solved',
  solveMoves: [],
  buildMoves: [],
  score: { matched: 9, total: 9, exact: true, moveCount: 0 },
}

describe('CubeCard', () => {
  it('keeps the face preview centered when the completion control is present', () => {
    const { container } = render(
      <CubeCard
        cube={cube}
        cubeIndex={0}
        positionLabel="Row 1 · Column 1"
        id="cube-card-0"
        onInspectCube={() => undefined}
        completed={false}
        celebrating={false}
        onToggleComplete={() => undefined}
      />,
    )

    const card = container.querySelector('.cube-card')
    expect(card).not.toBeNull()

    expect(card).toHaveStyle({ paddingLeft: '14px', paddingRight: '14px' })
  })
})
