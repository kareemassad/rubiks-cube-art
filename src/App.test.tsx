import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App, { InstructionPlayer, MoveChips } from './App'
import { solvedState } from './core/cube'
import type { GeneratedCube, TargetFace } from './types'

const instructionFace: TargetFace = [
  ['W', 'W', 'W'],
  ['W', 'W', 'W'],
  ['W', 'W', 'W'],
]

const instructionCube: GeneratedCube = {
  targetFace: instructionFace,
  outputFace: instructionFace,
  solvedFace: instructionFace,
  mountRotation: 0,
  displayFace: 'W',
  faceletState: solvedState(),
  solveMoves: [],
  buildMoves: [],
  score: { matched: 9, total: 9, exact: true, moveCount: 0 },
}

describe('App', () => {
  it('keeps the complete move sequence visible and highlights the active move', () => {
    render(<MoveChips moves={['R', 'U', "F'"]} activeStep={1} />)

    expect(screen.getByText('R')).toBeInTheDocument()
    expect(screen.getByText('U').closest('li')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText("F'")).toBeInTheDocument()
  })

  it('renders the generator controls and empty preview state', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /rubik's cube art generator/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/cubes to use/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cube rows/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cube columns/i)).toBeInTheDocument()
    expect(screen.queryByText(/requested cube count/i)).not.toBeInTheDocument()
    expect(screen.getByText('30 cubes', { exact: true })).toBeInTheDocument()
    expect(screen.getByText(/recommended: 30 cubes/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /upload an image/i })).toBeInTheDocument()
  })

  it('announces status updates to assistive technology', () => {
    const { container } = render(<App />)

    expect(container.querySelector('.status-line')).toHaveAttribute('aria-live', 'polite')
  })

  it('focuses the close control when the instruction sheet opens', () => {
    render(<InstructionPlayer cube={instructionCube} index={0} totalCubes={1} onClose={() => undefined} />)

    expect(screen.getByRole('button', { name: /close instructions/i })).toHaveFocus()
  })

  it('clamps huge dimensions to the exact instruction budget', () => {
    render(<App />)

    fireEvent.change(screen.getByLabelText(/cube rows/i), { target: { value: '200' } })
    fireEvent.change(screen.getByLabelText(/cube columns/i), { target: { value: '200' } })

    expect(screen.getByLabelText(/cube rows/i)).toHaveValue(200)
    expect(screen.getByLabelText(/cube columns/i)).toHaveValue(10)
    expect(screen.getAllByText(/2000 cubes/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/max 2000 cubes/i)).toBeInTheDocument()
  })
})
