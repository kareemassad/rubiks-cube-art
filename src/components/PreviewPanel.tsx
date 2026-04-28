import { lazy, Suspense, useMemo, useState } from 'react'
import { Grid3X3, Loader2 } from 'lucide-react'
import { CubeCard } from './CubeCard'
import { StickerGridPreview } from './StickerGridPreview'
import { buildCubeToGroupIndex } from '../core/mosaic/planIdentity'
import type { GeneratedCubeGroup, MosaicPlan, MosaicProgress, StickerGrid } from '../types'

const LazyPdfExport = lazy(() => import('./PdfExport').then((module) => ({ default: module.PdfExport })))
const CUBE_GROUP_PAGE_SIZE = 96

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
  completedGroupIds,
  celebratingGroupId,
  onToggleComplete,
  onInspectCube,
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
  completedGroupIds: Set<string>
  celebratingGroupId: string | null
  onToggleComplete: (groupId: string) => void
  onInspectCube: (cubeIndex: number) => void
}) {
  const [groupPage, setGroupPage] = useState(0)
  const [cubeLookup, setCubeLookup] = useState('')
  const [highlightedGroupId, setHighlightedGroupId] = useState<string | null>(null)
  const [pdfRequested, setPdfRequested] = useState(false)
  const totalGroupPages = Math.max(1, Math.ceil(cubeGroups.length / CUBE_GROUP_PAGE_SIZE))
  const activeGroupPage = Math.min(groupPage, totalGroupPages - 1)
  const cubeToGroupId = useMemo(() => buildCubeToGroupIndex(cubeGroups), [cubeGroups])
  const visibleCubeGroups = useMemo(
    () => cubeGroups.slice(activeGroupPage * CUBE_GROUP_PAGE_SIZE, (activeGroupPage + 1) * CUBE_GROUP_PAGE_SIZE),
    [activeGroupPage, cubeGroups],
  )

  function openCube(cubeIndex: number) {
    const groupId = cubeToGroupId.get(cubeIndex)
    if (groupId) {
      const groupIndex = cubeGroups.findIndex((group) => group.id === groupId)
      if (groupIndex >= 0) setGroupPage(Math.floor(groupIndex / CUBE_GROUP_PAGE_SIZE))
      setHighlightedGroupId(groupId)
    }
    onInspectCube(cubeIndex)
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
          {outputGrid && <StickerGridPreview grid={outputGrid} cols={plan.cols} label="Buildable generated cube mosaic preview" />}
          {outputGrid ? (
            <div className="pdf-export">
              {pdfRequested ? (
                <Suspense fallback={<button className="secondary-button" disabled>Preparing PDF</button>}>
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
          {cubeGroups.length > CUBE_GROUP_PAGE_SIZE ? (
            <div className="cube-list-toolbar">
              <span>
                Showing {activeGroupPage * CUBE_GROUP_PAGE_SIZE + 1}-{Math.min(cubeGroups.length, (activeGroupPage + 1) * CUBE_GROUP_PAGE_SIZE)} of {cubeGroups.length} groups
              </span>
              <div className="pagination-controls">
                <button onClick={() => setGroupPage((page) => Math.max(0, page - 1))} disabled={activeGroupPage === 0}>
                  Previous
                </button>
                <strong>
                  {activeGroupPage + 1} / {totalGroupPages}
                </strong>
                <button onClick={() => setGroupPage((page) => Math.min(totalGroupPages - 1, page + 1))} disabled={activeGroupPage >= totalGroupPages - 1}>
                  Next
                </button>
              </div>
            </div>
          ) : null}
          <div className="cube-list">
            {visibleCubeGroups.map((group) => (
              <CubeCard
                key={group.id}
                group={group}
                completed={completedGroupIds.has(group.id)}
                celebrating={celebratingGroupId === group.id}
                highlighted={highlightedGroupId === group.id}
                onToggleComplete={onToggleComplete}
                onInspectCube={openCube}
              />
            ))}
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
