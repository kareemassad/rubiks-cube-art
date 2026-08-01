import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { applyMoves, COLOR_HEX, FACE_COLORS, PLACEMENTS, solvedState } from './core/cube'
import { buildOutputStickerGrid, groupGeneratedCubes, suggestLayouts } from './core/mosaic'
import { generateMosaicPlan } from './core/workers/generateClient'
import { quantizeImagePreview } from './core/workers/previewClient'
import { hashMosaicPlan } from './core/mosaic/planIdentity'
import { MAX_PREVIEW_SOURCE_DIMENSION } from './core/image/palette'
import {
  migrateCompletedGroupIds,
  readCompletedGroups,
  writeCompletedGroups,
} from './core/storage/completionStorage'
import { MOUNT_COPY, RUBIK_COLOR_NAMES } from './constants/rubiks'
import { ControlPanel } from './components/ControlPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { TargetFacePreview } from './components/TargetFacePreview'
import {
  canGenerateInstructions,
  chooseLayoutForCubeCount,
  clampColumnsForRows,
  clampCubeDimension,
  clampRowsForColumns,
  cubeCount,
  layoutShapeMessage,
  layoutLimitMessage,
  MAX_GENERATION_CUBES,
  RECOMMENDED_CUBE_COUNT,
  maxColumnsForRows,
  maxRowsForColumns,
} from './core/layout'
import type {
  GeneratedCube,
  MosaicPlan,
  MosaicProgress,
  RubikColor,
  StickerGrid,
} from './types'

type LoadedImage = {
  id: number
  bitmap: ImageBitmap | HTMLImageElement
  url: string
  aspect: number
}

type QuantizedPreview = {
  grid: StickerGrid
  rows: number
  cols: number
}

const LazyCube3D = lazy(() => import('./components/Cube3D').then((module) => ({ default: module.Cube3D })))

function useDebouncedLayout(rows: number, cols: number, delayMs = 180) {
  const [layout, setLayout] = useState({ rows, cols })

  useEffect(() => {
    const timer = globalThis.setTimeout(() => setLayout({ rows, cols }), delayMs)
    return () => globalThis.clearTimeout(timer)
  }, [rows, cols, delayMs])

  return layout
}

async function loadImage(file: File): Promise<LoadedImage> {
  const url = URL.createObjectURL(file)
  const id = Date.now()
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file)
    return { id, bitmap, url, aspect: bitmap.width / bitmap.height }
  }

  const image = new Image()
  image.src = url
  await image.decode()
  return { id, bitmap: image, url, aspect: image.naturalWidth / image.naturalHeight }
}

const MOVE_FACE_COLORS: Record<string, RubikColor> = {
  U: 'W',
  D: 'Y',
  R: 'R',
  L: 'O',
  B: 'B',
  F: 'G',
}

const HERO_SAMPLE_STICKERS: readonly { id: string; color: RubikColor }[] = [
  { id: 'hero-red-top-left', color: 'R' },
  { id: 'hero-white-top-center', color: 'W' },
  { id: 'hero-blue-top-right', color: 'B' },
  { id: 'hero-yellow-middle-left', color: 'Y' },
  { id: 'hero-green-middle-center', color: 'G' },
  { id: 'hero-orange-middle-right', color: 'O' },
  { id: 'hero-white-bottom-left', color: 'W' },
  { id: 'hero-red-bottom-center', color: 'R' },
  { id: 'hero-blue-bottom-right', color: 'B' },
]

export function toggleCompletedCubeIds(current: Set<string>, cubeId: string): Set<string> {
  const next = new Set(current)
  if (next.has(cubeId)) {
    next.delete(cubeId)
  } else {
    next.add(cubeId)
  }
  return next
}

export function MoveChips({ moves, activeStep = -1 }: { moves: string[]; activeStep?: number }) {
  if (moves.length === 0) {
    return <p className="no-move">No twists. Use the solved face.</p>
  }

  const moveCounts = new Map<string, number>()
  const keyedMoves = moves.map((move, index) => {
    const occurrence = (moveCounts.get(move) ?? 0) + 1
    moveCounts.set(move, occurrence)
    return {
      id: `${move}-${occurrence}`,
      move,
      step: index + 1,
    }
  })

  return (
    <ol className="move-chips" aria-label="Build moves">
      {keyedMoves.map(({ id, move, step }) => {
        const color = MOVE_FACE_COLORS[move[0]] ?? 'W'
        const isActive = step - 1 === activeStep
        const className = [
          step - 1 < activeStep ? 'played' : '',
          isActive ? 'active' : '',
        ].filter(Boolean).join(' ')
        return (
          <li key={id} className={className} aria-current={isActive ? 'step' : undefined} style={{ borderColor: COLOR_HEX[color] }}>
            <span className="move-index">{step}</span>
            <strong style={{ background: COLOR_HEX[color] }}>{move}</strong>
          </li>
        )
      })}
    </ol>
  )
}

function CubeNet({ state }: { state: string }) {
  return (
    <svg className="cube-net" viewBox="0 0 480 360" role="img" aria-label="Rubik's cube flat net">
      {PLACEMENTS.map((placement) => {
        const face = state[placement.index] as keyof typeof FACE_COLORS
        return (
          <rect
            key={placement.index}
            x={placement.col * 40 + 1}
            y={placement.row * 40 + 1}
            width={38}
            height={38}
            rx={4}
            fill={FACE_COLORS[face]}
            stroke="#111827"
            strokeWidth={1.5}
          />
        )
      })}
    </svg>
  )
}

export function InstructionPlayer({
  cube,
  index,
  totalCubes,
  onClose,
}: {
  cube: GeneratedCube
  index: number
  totalCubes: number
  onClose: () => void
}) {
  const [step, setStep] = useState(0)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const visibleMoves = cube.buildMoves.slice(0, step)
  const state = applyMoves(solvedState(), visibleMoves)
  const nextMove = cube.buildMoves[step]

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = modalRef.current
    if (!dialog) return

    const focusableSelector = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')
    const getFocusableElements = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))

    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return
      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]
      const active = document.activeElement
      if (!dialog!.contains(active)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    function handleFocusIn(event: FocusEvent) {
      if (!dialog!.contains(event.target as Node)) closeButtonRef.current?.focus()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)
      previousFocus?.focus()
    }
  }, [])

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`cube-${index + 1}-instructions-title`}
      onClick={onClose}
    >
      <section ref={modalRef} className="instruction-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Build instructions</p>
            <h2 id={`cube-${index + 1}-instructions-title`}>Cube {index + 1} of {totalCubes}</h2>
          </div>
          <button ref={closeButtonRef} className="icon-button" onClick={onClose} aria-label="Close instructions">
            <X size={20} />
          </button>
        </div>
        <div className="instruction-grid">
          <div>
            <CubeNet state={state} />
            <div className="player-cube3d">
              <Suspense fallback={<div className="cube3d-loading">Loading 3D view…</div>}>
                <LazyCube3D state={state} />
              </Suspense>
            </div>
            <p className="cube-instruction">
              Step {step} of {cube.buildMoves.length}. {nextMove ? `Next move: ${nextMove}` : 'Ready to mount.'}
            </p>
          </div>
          <div className="instruction-side">
            <TargetFacePreview targetFace={cube.outputFace} className="output-exact" />
            <p>
              Hold the <strong>{RUBIK_COLOR_NAMES[cube.displayFace]}</strong> center facing you for every move. {MOUNT_COPY[cube.mountRotation]}.
            </p>
            <MoveChips moves={cube.buildMoves} activeStep={step} />
            <div className="player-controls">
              <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
                Back
              </button>
              <button onClick={() => setStep(Math.min(cube.buildMoves.length, step + 1))} disabled={step === cube.buildMoves.length}>
                Next
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default function App() {
  const previewCacheRef = useRef(new Map<string, QuantizedPreview>())
  const [loadedImage, setLoadedImage] = useState<LoadedImage | null>(null)
  const [rows, setRows] = useState(5)
  const [cols, setCols] = useState(6)
  const [cubesToUse, setCubesToUse] = useState(RECOMMENDED_CUBE_COUNT)
  const [plan, setPlan] = useState<MosaicPlan | null>(null)
  const [quantizedPreview, setQuantizedPreview] = useState<QuantizedPreview | null>(null)
  const [status, setStatus] = useState('Upload an image to start.')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [progress, setProgress] = useState<MosaicProgress | null>(null)
  const [selectedCubeIndex, setSelectedCubeIndex] = useState<number | null>(null)
  const [instructionCubeIndex, setInstructionCubeIndex] = useState<number | null>(null)
  const [cropToWall, setCropToWall] = useState(true)
  const [completedCubeIds, setCompletedCubeIds] = useState<Set<string>>(() => new Set())
  const [celebratingGroupId, setCelebratingGroupId] = useState<string | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  const suggestedLayouts = useMemo(
    () => (loadedImage ? suggestLayouts(loadedImage.aspect) : []),
    [loadedImage],
  )
  const orientationLabel = useMemo(() => {
    if (!loadedImage) return null
    if (loadedImage.aspect > 1.08) return 'Landscape'
    if (loadedImage.aspect < 0.92) return 'Portrait'
    return 'Square'
  }, [loadedImage])
  const cubeGroups = useMemo(() => (plan ? groupGeneratedCubes(plan.cubes) : []), [plan])
  const outputGrid = useMemo(() => (plan ? buildOutputStickerGrid(plan) : null), [plan])
  const planHash = useMemo(() => (plan ? hashMosaicPlan(plan) : null), [plan])
  const totalCubes = cubeCount(rows, cols)
  const layoutMessage = layoutShapeMessage(cubesToUse, { rows, cols })
  const limitMessage = layoutLimitMessage(rows, cols)
  const maxRows = maxRowsForColumns(cols)
  const maxCols = maxColumnsForRows(rows)
  const previewLayout = useDebouncedLayout(rows, cols)
  const isLayoutPending = previewLayout.rows !== rows || previewLayout.cols !== cols

  useEffect(() => {
    if (!loadedImage) return
    let cancelled = false
    const cacheKey = `${loadedImage.id}:${previewLayout.rows}:${previewLayout.cols}:${cropToWall}`
    const cached = previewCacheRef.current.get(cacheKey)
    if (cached) {
      previewCacheRef.current.delete(cacheKey)
      previewCacheRef.current.set(cacheKey, cached)
      setIsPreviewing(false)
      setQuantizedPreview(cached)
      setPlan(null)
      setStatus(`Closest-color preview ready at ${previewLayout.rows} x ${previewLayout.cols}.`)
      return
    }

    setIsPreviewing(true)
    quantizeImagePreview(loadedImage.bitmap, previewLayout.rows, previewLayout.cols, { cropToWall })
      .then((grid) => {
        if (cancelled) return
        const preview = { grid, rows: previewLayout.rows, cols: previewLayout.cols }
        previewCacheRef.current.set(cacheKey, preview)
        if (previewCacheRef.current.size > 12) {
          const oldestKey = previewCacheRef.current.keys().next().value
          if (oldestKey) previewCacheRef.current.delete(oldestKey)
        }
        setQuantizedPreview(preview)
        setPlan(null)
        setStatus(`Closest-color preview ready at ${previewLayout.rows} x ${previewLayout.cols}.`)
      })
      .catch((error) => {
        if (cancelled) return
        setStatus(error instanceof Error ? error.message : 'Could not render the color preview.')
      })
      .finally(() => {
        if (!cancelled) setIsPreviewing(false)
      })

    return () => {
      cancelled = true
    }
  }, [loadedImage, previewLayout.rows, previewLayout.cols, cropToWall])

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (loadedImage?.url) URL.revokeObjectURL(loadedImage.url)
    const next = await loadImage(file)
    previewCacheRef.current.clear()
    setLoadedImage(next)
    const layout = chooseLayoutForCubeCount(cubesToUse, next.aspect)
    setRows(layout.rows)
    setCols(layout.cols)
    setSelectedPreset(null)
    setPlan(null)
    setSelectedCubeIndex(null)
    setInstructionCubeIndex(null)
    setQuantizedPreview(null)
    setProgress(null)
    setStatus(`Loaded ${file.name}. Auto-fit chose ${layout.rows} x ${layout.cols}.`)
  }

  function applyLayout(layout: { label: string; rows: number; cols: number }) {
    const nextRows = clampCubeDimension(layout.rows)
    const nextCols = clampColumnsForRows(layout.cols, nextRows)
    setRows(nextRows)
    setCols(nextCols)
    setCubesToUse(cubeCount(nextRows, nextCols))
    setSelectedPreset(layout.label)
    setPlan(null)
    setSelectedCubeIndex(null)
    setInstructionCubeIndex(null)
    setProgress(null)
    setStatus(`Layout updated to ${nextRows} x ${nextCols} cubes.`)
  }

  function applyCubesToUse(nextCount: number) {
    const count = clampCubeDimension(nextCount, MAX_GENERATION_CUBES)
    const layout = chooseLayoutForCubeCount(count, loadedImage?.aspect ?? cols / rows)
    setCubesToUse(count)
    setRows(layout.rows)
    setCols(layout.cols)
    setSelectedPreset(null)
    setPlan(null)
    setSelectedCubeIndex(null)
    setInstructionCubeIndex(null)
    setProgress(null)
    setStatus(`Using ${count} cubes as ${layout.rows} x ${layout.cols}.`)
  }

  async function handleGenerate() {
    if (!loadedImage || !quantizedPreview || quantizedPreview.rows !== rows || quantizedPreview.cols !== cols || !canGenerateInstructions(rows, cols)) return
    setIsGenerating(true)
    setProgress({ completed: 0, total: totalCubes, cacheHits: 0, exact: 0 })
    setStatus(`Generating ${totalCubes} exact build instructions…`)
    try {
      const sourceWidth = 'naturalWidth' in loadedImage.bitmap ? loadedImage.bitmap.naturalWidth : loadedImage.bitmap.width
      const sourceHeight = 'naturalHeight' in loadedImage.bitmap ? loadedImage.bitmap.naturalHeight : loadedImage.bitmap.height
      const sourceDimension = Math.max(sourceWidth, sourceHeight)
      let generationGrid = quantizedPreview.grid
      if (sourceDimension > MAX_PREVIEW_SOURCE_DIMENSION) {
        setStatus('Matching full-resolution source colors…')
        generationGrid = await quantizeImagePreview(loadedImage.bitmap, rows, cols, {
          cropToWall,
          maxSourceDimension: sourceDimension,
        })
      }

      const nextPlan = await generateMosaicPlan(generationGrid, {
        rows,
        cols,
        onProgress: setProgress,
      })
      setPlan(nextPlan)
      setSelectedCubeIndex(null)
      setInstructionCubeIndex(null)
      const nextGroups = groupGeneratedCubes(nextPlan.cubes)
      const storedCompletions = readCompletedGroups(globalThis.localStorage, hashMosaicPlan(nextPlan))
      setCompletedCubeIds(migrateCompletedGroupIds(storedCompletions, nextGroups))
      setCelebratingGroupId(null)
      const exact = nextPlan.cubes.filter((cube) => cube.score.exact).length
      setStatus(
        `Generated ${nextPlan.cubes.length} cubes. ${exact} exact, ${nextPlan.cacheStats.hits} cache hits.`,
      )
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Generation failed.')
    } finally {
      setIsGenerating(false)
    }
  }

  function updateRows(nextRows: number) {
    const next = clampRowsForColumns(nextRows, cols)
    setRows(next)
    setCubesToUse(cubeCount(next, cols))
    setSelectedPreset(null)
    setPlan(null)
    setSelectedCubeIndex(null)
    setInstructionCubeIndex(null)
    setProgress(null)
  }

  function updateCols(nextCols: number) {
    const next = clampColumnsForRows(nextCols, rows)
    setCols(next)
    setCubesToUse(cubeCount(rows, next))
    setSelectedPreset(null)
    setPlan(null)
    setSelectedCubeIndex(null)
    setInstructionCubeIndex(null)
    setProgress(null)
  }

  function selectCube(cubeIndex: number) {
    setSelectedCubeIndex(cubeIndex)
    setInstructionCubeIndex(cubeIndex)
  }

  const toggleComplete = useCallback((cubeIndex: number) => {
    const cubeId = `cube-${cubeIndex}`
    const wasCompleted = completedCubeIds.has(cubeId)
    setCompletedCubeIds((current) => toggleCompletedCubeIds(current, cubeId))
    if (!wasCompleted) setCelebratingGroupId(cubeId)
  }, [completedCubeIds])

  useEffect(() => {
    if (!celebratingGroupId) return
    const timeout = globalThis.setTimeout(() => {
      setCelebratingGroupId((active) => (active === celebratingGroupId ? null : active))
    }, 1200)
    return () => globalThis.clearTimeout(timeout)
  }, [celebratingGroupId])

  useEffect(() => {
    if (!planHash) return
    writeCompletedGroups(globalThis.localStorage, planHash, completedCubeIds)
  }, [completedCubeIds, planHash])

  const generateDisabled =
    !loadedImage ||
    !quantizedPreview ||
    quantizedPreview.rows !== rows ||
    quantizedPreview.cols !== cols ||
    isGenerating ||
    isPreviewing ||
    isLayoutPending ||
    Boolean(limitMessage)

  return (
    <main className="app-shell">
      <section className="hero-band">
        <div>
          <p className="eyebrow">Mosaic workbench</p>
          <h1>Rubik&apos;s Cube Art Generator</h1>
          <p className="lede">
            Turn an image into a cube wall, reduce it to six Rubik colors, and generate moves from solved.
          </p>
        </div>
        <div className="hero-sample" aria-hidden="true">
          {HERO_SAMPLE_STICKERS.map((sticker) => (
            <span key={sticker.id} style={{ background: COLOR_HEX[sticker.color] }} />
          ))}
        </div>
      </section>

      <section className="workbench">
        <ControlPanel
          loadedImage={loadedImage}
          orientationLabel={orientationLabel}
          cropToWall={cropToWall}
          rows={rows}
          cols={cols}
          cubesToUse={cubesToUse}
          maxRows={maxRows}
          maxCols={maxCols}
          suggestedLayouts={suggestedLayouts}
          selectedPreset={selectedPreset}
          limitMessage={limitMessage}
          layoutMessage={layoutMessage}
          totalCubes={totalCubes}
          status={status}
          isLayoutPending={isLayoutPending}
          isGenerating={isGenerating}
          generateDisabled={generateDisabled}
          onFile={handleFile}
          onCubesToUseChange={applyCubesToUse}
          onRowsChange={updateRows}
          onColsChange={updateCols}
          onLayoutPreset={applyLayout}
          onCropToWallChange={setCropToWall}
          onGenerate={handleGenerate}
        />

        <PreviewPanel
          key={plan ? `${plan.rows}-${plan.cols}-${plan.cubes.length}` : 'draft'}
          plan={plan}
          quantizedPreview={quantizedPreview}
          outputGrid={outputGrid}
          cubeGroups={cubeGroups}
          rows={rows}
          cols={cols}
          totalCubes={totalCubes}
          isGenerating={isGenerating}
          isPreviewing={isPreviewing}
          progress={progress}
          completedCubeIds={completedCubeIds}
          celebratingGroupId={celebratingGroupId}
          onToggleComplete={toggleComplete}
          selectedCubeIndex={selectedCubeIndex}
          onSelectCube={selectCube}
        />
      </section>
      {plan && instructionCubeIndex !== null && plan.cubes[instructionCubeIndex] ? (
        <InstructionPlayer
          key={instructionCubeIndex}
          cube={plan.cubes[instructionCubeIndex]}
          index={instructionCubeIndex}
          totalCubes={plan.cubes.length}
          onClose={() => setInstructionCubeIndex(null)}
        />
      ) : null}
    </main>
  )
}
