import type { WheelEvent } from 'react'
import { Grid3X3, ImageUp, Loader2 } from 'lucide-react'
import { MAX_GENERATION_CUBES } from '../core/layout'

type LayoutPreset = {
  label: string
  rows: number
  cols: number
}

type SourceImage = {
  url: string
}

export function ControlPanel({
  loadedImage,
  orientationLabel,
  cropToWall,
  rows,
  cols,
  availableCubes,
  maxRows,
  maxCols,
  suggestedLayouts,
  selectedPreset,
  limitMessage,
  totalCubes,
  status,
  isLayoutPending,
  isGenerating,
  generateDisabled,
  onFile,
  onCubeCountChange,
  onRowsChange,
  onColsChange,
  onLayoutPreset,
  onCropToWallChange,
  onGenerate,
}: {
  loadedImage: SourceImage | null
  orientationLabel: string | null
  cropToWall: boolean
  rows: number
  cols: number
  availableCubes: number
  maxRows: number
  maxCols: number
  suggestedLayouts: LayoutPreset[]
  selectedPreset: string | null
  limitMessage: string | null
  totalCubes: number
  status: string
  isLayoutPending: boolean
  isGenerating: boolean
  generateDisabled: boolean
  onFile: (file: File | undefined) => void
  onCubeCountChange: (count: number) => void
  onRowsChange: (rows: number) => void
  onColsChange: (cols: number) => void
  onLayoutPreset: (layout: LayoutPreset) => void
  onCropToWallChange: (cropToWall: boolean) => void
  onGenerate: () => void
}) {
  function stopNumberWheel(event: WheelEvent<HTMLInputElement>) {
    event.currentTarget.blur()
  }

  return (
    <aside className="control-panel">
      <label className="upload-drop">
        <ImageUp size={22} />
        <span>{loadedImage ? 'Replace source image' : 'Upload source image'}</span>
        <input type="file" accept="image/*" onChange={(event) => onFile(event.target.files?.[0])} />
      </label>

      {loadedImage ? (
        <div className="source-frame">
          <img className={cropToWall ? 'source-preview crop' : 'source-preview'} src={loadedImage.url} alt="Uploaded source" />
          <span className="orientation-badge">{orientationLabel}</span>
        </div>
      ) : (
        <div className="empty-source">
          <Grid3X3 size={28} />
          <span>Upload an image to start.</span>
        </div>
      )}

      <div className="field-grid">
        <label className="wide-field">
          <span>Cubes available</span>
          <input
            aria-label="Cubes available"
            type="number"
            min={1}
            max={MAX_GENERATION_CUBES}
            value={availableCubes}
            onChange={(event) => onCubeCountChange(Number(event.target.value))}
            onWheel={stopNumberWheel}
          />
          <small>Auto-fits rows and columns</small>
        </label>
        <label>
          <span>Cube rows</span>
          <input
            aria-label="Cube rows"
            type="number"
            min={1}
            max={maxRows}
            value={rows}
            onChange={(event) => onRowsChange(Number(event.target.value))}
            onWheel={stopNumberWheel}
          />
          <small>Max {maxRows} with {cols} columns</small>
        </label>
        <label>
          <span>Cube columns</span>
          <input
            aria-label="Cube columns"
            type="number"
            min={1}
            max={maxCols}
            value={cols}
            onChange={(event) => onColsChange(Number(event.target.value))}
            onWheel={stopNumberWheel}
          />
          <small>Max {maxCols} with {rows} rows</small>
        </label>
      </div>

      {loadedImage && (
        <div className="layout-suggestions">
          <span className="control-label">Layout presets</span>
          <div className="suggestion-grid">
            {suggestedLayouts.map((layout) => (
              <button
                key={layout.label}
                className={selectedPreset === layout.label ? 'suggestion active' : 'suggestion'}
                onClick={(event) => {
                  event.currentTarget.blur()
                  onLayoutPreset(layout)
                }}
              >
                <strong>{layout.label}</strong>
                <span>
                  {layout.rows} x {layout.cols}
                </span>
                <small>{layout.rows * layout.cols} cubes</small>
              </button>
            ))}
          </div>
        </div>
      )}

      {loadedImage && (
        <label className="crop-toggle">
          <input
            type="checkbox"
            checked={cropToWall}
            onChange={(event) => onCropToWallChange(event.target.checked)}
          />
          <span>Crop source to wall</span>
        </label>
      )}

      <div className={limitMessage ? 'limit-note warning' : 'limit-note'}>
        <strong>{totalCubes} cubes</strong>
        <span>
          {limitMessage ??
            `${totalCubes * 9} stickers. Max ${MAX_GENERATION_CUBES} cubes; long mosaics scroll.`}
        </span>
      </div>

      <button className="primary-button" disabled={generateDisabled} onClick={onGenerate}>
        {isGenerating ? <Loader2 className="spin" size={18} /> : <Grid3X3 size={18} />}
        {isGenerating ? 'Generating' : 'Generate instructions'}
      </button>
      <p className="status-line">{isLayoutPending ? 'Updating preview...' : status}</p>
    </aside>
  )
}
