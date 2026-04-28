import { FACES } from './index'
import type { Face } from './index'

export type Vec3 = [number, number, number]

type Placement3D = {
  index: number
  face: Face
  facePos: number
  cubie: Vec3
  normal: Vec3
}

const FACE_INDEX_OFFSETS: Record<Face, number> = {
  U: 0,
  R: 9,
  F: 18,
  D: 27,
  L: 36,
  B: 45,
}

const FACE_NORMALS: Record<Face, Vec3> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
  L: [-1, 0, 0],
  R: [1, 0, 0],
}

function cubieFor(face: Face, col: number, row: number): Vec3 {
  const c = col - 1
  const r = row - 1
  switch (face) {
    case 'U':
      return [c, 1, r]
    case 'D':
      return [c, -1, -r]
    case 'F':
      return [c, -r, 1]
    case 'B':
      return [-c, -r, -1]
    case 'L':
      return [-1, -r, c]
    case 'R':
      return [1, -r, -c]
  }
}

const PLACEMENTS_3D: readonly Placement3D[] = (() => {
  const out: Placement3D[] = []
  for (const face of FACES) {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const facePos = row * 3 + col
        out.push({
          index: FACE_INDEX_OFFSETS[face] + facePos,
          face,
          facePos,
          cubie: cubieFor(face, col, row),
          normal: FACE_NORMALS[face],
        })
      }
    }
  }
  return out.sort((a, b) => a.index - b.index)
})()

export const STICKERS_BY_CUBIE: Readonly<Record<string, readonly Placement3D[]>> = (() => {
  const map: Record<string, Placement3D[]> = {}
  for (const placement of PLACEMENTS_3D) {
    const key = placement.cubie.join(',')
    ;(map[key] ??= []).push(placement)
  }
  return map
})()

export function cubieKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`
}

export function cubieOnFace(face: Face, [x, y, z]: Vec3): boolean {
  switch (face) {
    case 'U':
      return y === 1
    case 'D':
      return y === -1
    case 'F':
      return z === 1
    case 'B':
      return z === -1
    case 'L':
      return x === -1
    case 'R':
      return x === 1
  }
}

export function rotationAxis(face: Face): 'x' | 'y' | 'z' {
  switch (face) {
    case 'U':
    case 'D':
      return 'y'
    case 'L':
    case 'R':
      return 'x'
    case 'F':
    case 'B':
      return 'z'
  }
}

export function rotationAngle(face: Face, turns: 1 | -1 | 2): number {
  const sign = face === 'U' || face === 'R' || face === 'F' ? -1 : 1
  return sign * turns * (Math.PI / 2)
}
