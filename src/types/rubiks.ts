export type RubikColor = 'W' | 'Y' | 'R' | 'O' | 'B' | 'G'

export type TargetFace = [
  [RubikColor, RubikColor, RubikColor],
  [RubikColor, RubikColor, RubikColor],
  [RubikColor, RubikColor, RubikColor],
]

export type StickerGrid = RubikColor[][]

type OptimizerMode = 'visual' | 'balanced' | 'moves'

export type OptimizerOptions = {
  mode: OptimizerMode
  maxDepth: number
  candidateLimit: number
}

export type MountRotation = 0 | 90 | 180 | 270

export type GeneratedCube = {
  targetFace: TargetFace
  outputFace: TargetFace
  solvedFace: TargetFace
  mountRotation: MountRotation
  duplicateOf?: number
  displayFace: RubikColor
  faceletState: string
  solveMoves: string[]
  buildMoves: string[]
  score: {
    matched: number
    total: number
    exact: boolean
    moveCount: number
  }
}

export type MosaicPlan = {
  rows: number
  cols: number
  stickerGrid: StickerGrid
  cubes: GeneratedCube[]
  cacheStats: {
    hits: number
    misses: number
    rotationHits: number
  }
}

export type GeneratedCubeGroup = {
  id: string
  cube: GeneratedCube
  indices: number[]
}

export type MosaicProgress = {
  completed: number
  total: number
  cacheHits: number
  exact: number
}
