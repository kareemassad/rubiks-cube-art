import { lazy, Suspense, useEffect, useState } from 'react'
import { Grid3X3, Loader2 } from 'lucide-react'
import { CubeCard } from './CubeCard'
import { StickerGridPreview } from './StickerGridPreview'
import type { GeneratedCubeGroup, MosaicPlan, MosaicProgress, StickerGrid } from '../types'

const LazyPdfExport = lazy(() => import('./PdfExport').then((module) => ({ default: module.PdfExport })))
const CUBE_PAGE_SIZE = 96

export function getSelectionScrollBehavior(): 'auto' | 'smooth' {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

type QuantizedPreview = {
  grid: StickerGrid
  rows: number
  cols: number
}

export function PreviewPanel({
  plan,
  quantizedPreview,
  outputGrid,
  cubeGroups,
  rows,
  cols,
  totalCubes,
  isGenerating,
  isPreviewing,
  progress,
  completedCubeIds,
  celebratingGroupId,
  selectedCubeIndex,
  onToggleComplete,
  onSelectCube,
}: {
  plan: MosaicPlan | null
  quantizedPreview: QuantizedPreview | null
  outputGrid: StickerGrid | null
  cubeGroups: GeneratedCubeGroup[]
  rows: number
  cols: number
  totalCubes: number
  isGenerating: boolean
  isPreviewing: boolean
  progress: MosaicProgress | null
  completedCubeIds: Set<string>
  celebratingGroupId: string | null
  selectedCubeIndex: number | null
  onToggleComplete: (cubeIndex: number) => void
  onSelectCube: (cubeIndex: number) => void
}) {
  const [cubePage, setCubePage] = useState(0)
  const [cubeLookup, setCubeLookup] = useState('')
  const [pdfRequested, setPdfRequested] = useState(false)
  const totalCubePages = Math.max(1, Math.ceil((plan?.cubes.length ?? 0) / CUBE_PAGE_SIZE))
  const activeCubePage = Math.min(cubePage, totalCubePages - 1)
  const visibleCubeIndexes = plan
    ? Array.from(
        { length: Math.min(CUBE_PAGE_SIZE, plan.cubes.length - activeCubePage * CUBE_PAGE_SIZE) },
        (_, offset) => activeCubePage * CUBE_PAGE_SIZE + offset,
      )
    : []

  useEffect(() => {
    if (selectedCubeIndex === null) return
    const card = document.getElementById(`cube-card-${selectedCubeIndex}`)
    card?.scrollIntoView?.({ block: 'nearest', behavior: getSelectionScrollBehavior() })
  }, [selectedCubeIndex])

  function openCube(cubeIndex: number) {
    if (!plan || cubeIndex < 0 || cubeIndex >= plan.cubes.length) return
    setCubePage(Math.floor(cubeIndex / CUBE_PAGE_SIZE))
    onSelectCube(cubeIndex)
  }

  function openLookupCube() {
    if (!plan) return
    const cubeNumber = Math.round(Number(cubeLookup))
    if (!Number.isFinite(cubeNumber) || cubeNumber < 1 || cubeNumber > plan.cubes.length) return
    openCube(cubeNumber - 1)
  }

  return (
    <section className={plan || quantizedPreview ? 'preview-panel' : 'preview-panel empty'} aria-busy={isGenerating || isPreviewing}>
      {(isGenerating || isPreviewing) && (
        <div className="loading-screen">
          <Loader2 className="spin" size={34} />
          <h2>{isGenerating ? 'Solving faces' : 'Matching colors'}</h2>
          <p>
            {isGenerating && progress
              ? `${progress.completed} of ${progress.total} cubes processed. ${progress.exact} exact so far.`
              : `Rendering a ${rows * 3} x ${cols * 3} sticker mosaic.`}
          </p>
          {isGenerating && progress ? (
            <div className="progress-track">
              <span style={{ width: `${Math.round((progress.completed / progress.total) * 100)}%` }} />
            </div>
          ) : null}
        </div>
      )}
      {plan ? (
        <>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Generated</p>
              <h2>
                {plan.rows} x {plan.cols} cubes, {plan.rows * plan.cols * 9} stickers
              </h2>
            </div>
            <span className="cache-note">
              {plan.cacheStats.hits} duplicates reused · {plan.cacheStats.rotationHits} rotated
            </span>
          </div>
          {outputGrid && (
            <StickerGridPreview
              grid={outputGrid}
              rows={plan.rows}
              cols={plan.cols}
              selectedCubeIndex={selectedCubeIndex}
              onSelectCube={openCube}
              label="Buildable generated cube mosaic preview"
            />
          )}
          {outputGrid ? (
            <div className="pdf-export">
              {pdfRequested ? (
                <Suspense fallback={<button className="secondary-button" disabled>Preparing PDF…</button>}>
                  <LazyPdfExport plan={plan} groups={cubeGroups} outputGrid={outputGrid} />
                </Suspense>
              ) : (
                <button className="secondary-button pdf-button" onClick={() => setPdfRequested(true)}>
                  Prepare PDF
                </button>
              )}
            </div>
          ) : null}
          <div
            className="cube-lookup"
          >
            <label>
              <span>Open cube</span>
              <input
                aria-label="Open cube number"
                name="cubeLookup"
                type="number"
                min={1}
                max={plan.cubes.length}
                value={cubeLookup}
                placeholder={`1-${plan.cubes.length}`}
                onChange={(event) => setCubeLookup(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') openLookupCube()
                }}
              />
            </label>
            <button type="button" onClick={openLookupCube}>Open</button>
          </div>
          {plan.cubes.length > CUBE_PAGE_SIZE ? (
            <div className="cube-list-toolbar">
              <span>
                Showing {activeCubePage * CUBE_PAGE_SIZE + 1}-{Math.min(plan.cubes.length, (activeCubePage + 1) * CUBE_PAGE_SIZE)} of {plan.cubes.length} cubes
              </span>
              <div className="pagination-controls">
                <button onClick={() => setCubePage((page) => Math.max(0, page - 1))} disabled={activeCubePage === 0}>
                  Previous
                </button>
                <strong>
                  {activeCubePage + 1} / {totalCubePages}
                </strong>
                <button onClick={() => setCubePage((page) => Math.min(totalCubePages - 1, page + 1))} disabled={activeCubePage >= totalCubePages - 1}>
                  Next
                </button>
              </div>
            </div>
          ) : null}
          <div className="cube-list">
            {visibleCubeIndexes.map((cubeIndex) => {
              const cube = plan.cubes[cubeIndex]
              const cubeRow = Math.floor(cubeIndex / plan.cols) + 1
              const cubeColumn = (cubeIndex % plan.cols) + 1
              return (
              <CubeCard
                key={cubeIndex}
                id={`cube-card-${cubeIndex}`}
                cube={cube}
                cubeIndex={cubeIndex}
                positionLabel={`Row ${cubeRow} · Column ${cubeColumn}`}
                completed={completedCubeIds.has(`cube-${cubeIndex}`)}
                celebrating={celebratingGroupId === `cube-${cubeIndex}`}
                highlighted={selectedCubeIndex === cubeIndex}
                onToggleComplete={onToggleComplete}
                onInspectCube={openCube}
              />
              )
            })}
          </div>
        </>
      ) : quantizedPreview ? (
        <>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Draft</p>
              <h2>
                {rows} x {cols} preview
              </h2>
            </div>
            <span className="cache-note">{totalCubes} cubes</span>
          </div>
          <StickerGridPreview grid={quantizedPreview.grid} cols={quantizedPreview.cols} label="Draft Rubik color mosaic preview" />
          <div className="empty-plan compact">
            <Grid3X3 size={34} />
            <h2>Ready.</h2>
            <p>Generate to turn the color draft into solved-cube instructions.</p>
          </div>
        </>
      ) : (
        <div className="empty-plan">
          <Grid3X3 size={42} />
          <h2>Upload an image.</h2>
          <p>Preview the color mosaic, then generate cube instructions.</p>
        </div>
      )}
    </section>
  )
}
