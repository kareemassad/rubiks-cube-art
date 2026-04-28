import { COLOR_TO_FACE, cubieStateToFacelets, solvedState } from './index'
import type { CubieState, Face } from './index'
import type { RubikColor, TargetFace } from '../../types'

const FACE_INDEX_OFFSETS: Record<Face, number> = {
  U: 0,
  R: 9,
  F: 18,
  D: 27,
  L: 36,
  B: 45,
}

const CORNER_FACELETS = [
  [8, 9, 20],
  [6, 18, 38],
  [0, 36, 47],
  [2, 45, 11],
  [29, 26, 15],
  [27, 44, 24],
  [33, 53, 42],
  [35, 17, 51],
] as const

const EDGE_FACELETS = [
  [5, 10],
  [7, 19],
  [3, 37],
  [1, 46],
  [32, 16],
  [28, 25],
  [30, 43],
  [34, 52],
  [23, 12],
  [21, 41],
  [50, 39],
  [48, 14],
] as const

const CORNER_COLORS: readonly Face[][] = [
  ['U', 'R', 'F'],
  ['U', 'F', 'L'],
  ['U', 'L', 'B'],
  ['U', 'B', 'R'],
  ['D', 'F', 'R'],
  ['D', 'L', 'F'],
  ['D', 'B', 'L'],
  ['D', 'R', 'B'],
]

const EDGE_COLORS: readonly Face[][] = [
  ['U', 'R'],
  ['U', 'F'],
  ['U', 'L'],
  ['U', 'B'],
  ['D', 'R'],
  ['D', 'F'],
  ['D', 'L'],
  ['D', 'B'],
  ['F', 'R'],
  ['F', 'L'],
  ['B', 'L'],
  ['B', 'R'],
]

type PieceConstraint = {
  position: number
  facelet: number
  color: Face
}

type PieceAssignment = {
  piece: number
  orientation: number
}

function parity(values: number[]): 0 | 1 {
  let inversions = 0
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (values[i] > values[j]) inversions++
    }
  }
  return (inversions % 2) as 0 | 1
}

function findCornerPosition(facelet: number): number {
  return CORNER_FACELETS.findIndex((facelets) => (facelets as readonly number[]).includes(facelet))
}

function findEdgePosition(facelet: number): number {
  return EDGE_FACELETS.findIndex((facelets) => (facelets as readonly number[]).includes(facelet))
}

function backtrackPieces(
  constraints: PieceConstraint[],
  pieceColors: readonly Face[][],
  pieceFacelets: readonly (readonly number[])[],
): Map<number, PieceAssignment> | null {
  const assignments = new Map<number, PieceAssignment>()
  const usedPieces = new Set<number>()

  function visit(index: number): boolean {
    if (index >= constraints.length) return true
    const constraint = constraints[index]
    const faceletSlot = pieceFacelets[constraint.position].indexOf(constraint.facelet)

    for (let piece = 0; piece < pieceColors.length; piece++) {
      if (usedPieces.has(piece)) continue
      const colorSlot = pieceColors[piece].indexOf(constraint.color)
      if (colorSlot === -1) continue
      const orientation = (faceletSlot - colorSlot + pieceColors[piece].length) % pieceColors[piece].length
      assignments.set(constraint.position, { piece, orientation })
      usedPieces.add(piece)
      if (visit(index + 1)) return true
      usedPieces.delete(piece)
      assignments.delete(constraint.position)
    }

    return false
  }

  return visit(0) ? assignments : null
}

function targetConstraints(targetFace: TargetFace, displayFace: Face) {
  const offset = FACE_INDEX_OFFSETS[displayFace]
  const corners: PieceConstraint[] = []
  const edges: PieceConstraint[] = []

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (row === 1 && col === 1) continue
      const facelet = offset + row * 3 + col
      const color = COLOR_TO_FACE[targetFace[row][col]]
      const cornerPosition = findCornerPosition(facelet)
      if (cornerPosition !== -1) {
        corners.push({ position: cornerPosition, facelet, color })
        continue
      }
      const edgePosition = findEdgePosition(facelet)
      if (edgePosition !== -1) edges.push({ position: edgePosition, facelet, color })
    }
  }

  return { corners, edges }
}

export function buildExactFaceletState(targetFace: TargetFace): string | null {
  const displayFace = COLOR_TO_FACE[targetFace[1][1]]
  if (targetFace.every((row) => row.every((color) => color === targetFace[1][1]))) {
    return solvedState()
  }

  const constraints = targetConstraints(targetFace, displayFace)
  const cornerAssignments = backtrackPieces(constraints.corners, CORNER_COLORS, CORNER_FACELETS)
  const edgeAssignments = backtrackPieces(constraints.edges, EDGE_COLORS, EDGE_FACELETS)
  if (!cornerAssignments || !edgeAssignments) return null

  const state: CubieState = {
    center: [0, 1, 2, 3, 4, 5],
    cp: Array.from({ length: 8 }, (_, index) => index),
    co: Array.from({ length: 8 }, () => 0),
    ep: Array.from({ length: 12 }, (_, index) => index),
    eo: Array.from({ length: 12 }, () => 0),
  }

  const usedCorners = new Set<number>()
  for (const [position, assignment] of cornerAssignments) {
    state.cp[position] = assignment.piece
    state.co[position] = assignment.orientation
    usedCorners.add(assignment.piece)
  }

  const freeCornerPositions = state.cp.map((_, index) => index).filter((position) => !cornerAssignments.has(position))
  const freeCornerPieces = Array.from({ length: 8 }, (_, index) => index).filter((piece) => !usedCorners.has(piece))
  for (const [index, position] of freeCornerPositions.entries()) {
    state.cp[position] = freeCornerPieces[index]
  }

  const cornerOrientationTotal = state.co.reduce((sum, orientation) => sum + orientation, 0)
  const cornerFixPosition = freeCornerPositions.at(-1)
  if (cornerFixPosition !== undefined) {
    state.co[cornerFixPosition] = (3 - (cornerOrientationTotal % 3)) % 3
  }

  const usedEdges = new Set<number>()
  for (const [position, assignment] of edgeAssignments) {
    state.ep[position] = assignment.piece
    state.eo[position] = assignment.orientation
    usedEdges.add(assignment.piece)
  }

  const freeEdgePositions = state.ep.map((_, index) => index).filter((position) => !edgeAssignments.has(position))
  const freeEdgePieces = Array.from({ length: 12 }, (_, index) => index).filter((piece) => !usedEdges.has(piece))
  for (const [index, position] of freeEdgePositions.entries()) {
    state.ep[position] = freeEdgePieces[index]
  }

  const edgeOrientationTotal = state.eo.reduce((sum, orientation) => sum + orientation, 0)
  const edgeFixPosition = freeEdgePositions.at(-1)
  if (edgeFixPosition !== undefined) {
    state.eo[edgeFixPosition] = edgeOrientationTotal % 2
  }

  if (parity(state.cp) !== parity(state.ep)) {
    const [first, second] = freeEdgePositions
    if (first === undefined || second === undefined) return null
    ;[state.ep[first], state.ep[second]] = [state.ep[second], state.ep[first]]
  }

  return cubieStateToFacelets(state)
}
