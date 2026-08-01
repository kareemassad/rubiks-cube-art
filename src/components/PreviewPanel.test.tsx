import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSelectionScrollBehavior, PreviewPanel } from './PreviewPanel'
import type { GeneratedCube, GeneratedCubeGroup, MosaicPlan, TargetFace } from '../types'

const pdfExportMock = vi.fn(() => <a href="/test.pdf">Export PDF</a>)

vi.mock('./PdfExport', () => ({
  PdfExport: pdfExportMock,
}))

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

const face: TargetFace = [
  ['W', 'W', 'W'],
  ['W', 'W', 'W'],
  ['W', 'W', 'W'],
]

function cube(): GeneratedCube {
  return {
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
}

function plan(): MosaicPlan {
  return {
    rows: 1,
    cols: 1,
    stickerGrid: face,
    cubes: [cube()],
    cacheStats: { hits: 0, misses: 1, rotationHits: 0 },
  }
}

describe('PreviewPanel', () => {
  it('uses instant scrolling when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))

    expect(getSelectionScrollBehavior()).toBe('auto')
  })

  it('uses smooth scrolling when reduced motion is not requested', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))

    expect(getSelectionScrollBehavior()).toBe('smooth')
  })

  it('does not load the PDF export module until the user asks for export', () => {
    const nextPlan = plan()
    const groups: GeneratedCubeGroup[] = [{ id: 'white', cube: nextPlan.cubes[0], indices: [0] }]
    const onSelectCube = vi.fn()

    render(
      <PreviewPanel
        plan={nextPlan}
        quantizedPreview={null}
        outputGrid={face}
        cubeGroups={groups}
        rows={1}
        cols={1}
        totalCubes={1}
        isGenerating={false}
        isPreviewing={false}
        progress={null}
        completedCubeIds={new Set()}
        celebratingGroupId={null}
        selectedCubeIndex={null}
        onToggleComplete={() => undefined}
        onSelectCube={onSelectCube}
      />,
    )

    expect(screen.getByRole('button', { name: /prepare pdf/i })).toBeInTheDocument()
    expect(screen.getByText(/cube 1/i)).toBeInTheDocument()
    const inspectButton = screen.getByRole('button', { name: /view instructions for cube 1/i })
    expect(inspectButton).toBeInTheDocument()
    fireEvent.click(inspectButton)
    expect(onSelectCube).toHaveBeenCalledWith(0)
    expect(pdfExportMock).not.toHaveBeenCalled()
  })
})
