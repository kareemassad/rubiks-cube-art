import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./core/workers/generateClient', () => ({ generateMosaicPlan: vi.fn() }))
vi.mock('./core/workers/previewClient', () => ({ quantizeImagePreview: vi.fn() }))
vi.mock('./components/Cube3D', () => ({ Cube3D: () => <div data-testid="cube-3d" /> }))

import App, { InstructionPlayer, MoveChips } from './App'
import { solvedState } from './core/cube'
import { generateMosaicPlan } from './core/workers/generateClient'
import { quantizeImagePreview } from './core/workers/previewClient'
import type { GeneratedCube, MosaicPlan, StickerGrid, TargetFace } from './types'

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

  it('keeps completed moves played after the final step', () => {
    render(<MoveChips moves={['R', 'U', "F'"]} activeStep={3} />)

    expect(screen.getByText('R').closest('li')).toHaveClass('played')
    expect(screen.getByText('U').closest('li')).toHaveClass('played')
    expect(screen.getByText("F'").closest('li')).toHaveClass('played')
    expect(document.querySelector('[aria-current="step"]')).toBeNull()
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

  it('traps keyboard focus inside the instruction sheet', () => {
    const cube = { ...instructionCube, buildMoves: ['R', 'U'] }
    render(<InstructionPlayer cube={cube} index={0} totalCubes={1} onClose={() => undefined} />)

    const close = screen.getByRole('button', { name: /close instructions/i })
    const next = screen.getByRole('button', { name: 'Next' })

    next.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(close).toHaveFocus()

    close.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(next).toHaveFocus()
  })

  it('keeps the selected cube highlighted after closing its instruction sheet', async () => {
    const previewMock = vi.mocked(quantizeImagePreview)
    const generateMock = vi.mocked(generateMosaicPlan)
    const grid: StickerGrid = [
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
      ['W', 'W', 'W'],
    ]
    const generatedPlan: MosaicPlan = {
      rows: 1,
      cols: 1,
      stickerGrid: grid,
      cubes: [instructionCube],
      cacheStats: { hits: 0, misses: 1, rotationHits: 0 },
    }
    previewMock.mockResolvedValue(grid)
    generateMock.mockResolvedValue(generatedPlan)

    Object.defineProperty(window, 'createImageBitmap', {
      configurable: true,
      value: vi.fn(async () => ({ width: 3, height: 3 }) as unknown as ImageBitmap),
    })
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })

    render(<App />)
    fireEvent.change(screen.getByLabelText(/cubes to use/i), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText(/upload source image/i), {
      target: { files: [new File(['image'], 'source.png', { type: 'image/png' })] },
    })

    await waitFor(() => expect(screen.getByRole('button', { name: /generate instructions/i })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: /generate instructions/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /select cube 1/i })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /select cube 1/i }))
    fireEvent.click(screen.getByRole('button', { name: /close instructions/i }))

    expect(screen.getByRole('button', { name: /select cube 1/i })).toHaveAttribute('aria-pressed', 'true')
    expect(document.getElementById('cube-card-0')).toHaveClass('highlighted')
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
