import Cube from 'cubejs'
import type { RubikColor, TargetFace } from '../../types'

export type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B'

export const FACES: readonly Face[] = ['U', 'R', 'F', 'D', 'L', 'B'] as const

export const FACE_COLORS: Readonly<Record<Face, string>> = {
  U: '#f8fafc',
  R: '#c1121f',
  F: '#0a8f43',
  D: '#ffd500',
  L: '#f77f00',
  B: '#0057b8',
}

export const COLOR_HEX: Readonly<Record<RubikColor, string>> = {
  W: '#f8fafc',
  Y: '#ffd500',
  R: '#c1121f',
  O: '#f77f00',
  B: '#0057b8',
  G: '#0a8f43',
}

const FACE_TO_COLOR: Readonly<Record<Face, RubikColor>> = {
  U: 'W',
  D: 'Y',
  R: 'R',
  L: 'O',
  B: 'B',
  F: 'G',
}

export const COLOR_TO_FACE: Readonly<Record<RubikColor, Face>> = {
  W: 'U',
  Y: 'D',
  R: 'R',
  O: 'L',
  B: 'B',
  G: 'F',
}

const SOLVED_STATE =
  'UUUUUUUUU' + 'RRRRRRRRR' + 'FFFFFFFFF' + 'DDDDDDDDD' + 'LLLLLLLLL' + 'BBBBBBBBB'

const FACE_INDEX_OFFSETS: Record<Face, number> = {
  U: 0,
  R: 9,
  F: 18,
  D: 27,
  L: 36,
  B: 45,
}

const FACE_GRID_OFFSETS: Record<Face, { col: number; row: number }> = {
  U: { col: 3, row: 0 },
  L: { col: 0, row: 3 },
  F: { col: 3, row: 3 },
  R: { col: 6, row: 3 },
  B: { col: 9, row: 3 },
  D: { col: 3, row: 6 },
}

type FacePlacement = {
  index: number
  face: Face
  facePos: number
  col: number
  row: number
}

export const PLACEMENTS: readonly FacePlacement[] = (() => {
  const placements: FacePlacement[] = []
  for (const face of FACES) {
    const grid = FACE_GRID_OFFSETS[face]
    const offset = FACE_INDEX_OFFSETS[face]
    for (let pos = 0; pos < 9; pos++) {
      placements.push({
        index: offset + pos,
        face,
        facePos: pos,
        col: grid.col + (pos % 3),
        row: grid.row + Math.floor(pos / 3),
      })
    }
  }
  return placements.sort((a, b) => a.index - b.index)
})()

let solverReady = false

function initSolver(): void {
  if (solverReady) return
  Cube.initSolver()
  solverReady = true
}

export function solvedState(): string {
  return SOLVED_STATE
}

export type CubieState = {
  center: number[]
  cp: number[]
  co: number[]
  ep: number[]
  eo: number[]
}

export function cubieStateToFacelets(state: CubieState): string {
  return new Cube(state).asString()
}

export function applyMoves(state: string, moves: string[] | string): string {
  const cube = Cube.fromString(state)
  const algorithm = Array.isArray(moves) ? moves.join(' ') : moves
  if (algorithm.trim()) cube.move(algorithm)
  return cube.asString()
}

export function solveState(state: string): string[] {
  initSolver()
  const cube = Cube.fromString(state)
  if (cube.asString() !== state) throw new Error('Generated cube state is not physically reachable')
  if (cube.isSolved()) return []

  for (let depth = 1; depth <= 4; depth++) {
    try {
      const short = cube.solve(depth)
      return short.split(' ').filter(Boolean)
    } catch {
      // Keep probing shallow exact depths before falling back to cubejs default.
    }
  }

  return cube.solve().split(' ').filter(Boolean)
}

export function faceColors(state: string, displayColor: RubikColor): TargetFace {
  const face = COLOR_TO_FACE[displayColor]
  const offset = FACE_INDEX_OFFSETS[face]
  return [
    [
      FACE_TO_COLOR[state[offset] as Face],
      FACE_TO_COLOR[state[offset + 1] as Face],
      FACE_TO_COLOR[state[offset + 2] as Face],
    ],
    [
      FACE_TO_COLOR[state[offset + 3] as Face],
      FACE_TO_COLOR[state[offset + 4] as Face],
      FACE_TO_COLOR[state[offset + 5] as Face],
    ],
    [
      FACE_TO_COLOR[state[offset + 6] as Face],
      FACE_TO_COLOR[state[offset + 7] as Face],
      FACE_TO_COLOR[state[offset + 8] as Face],
    ],
  ]
}

export function targetKey(face: TargetFace): string {
  return face.flat().join('')
}
