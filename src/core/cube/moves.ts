import type { Face } from './index'

type ParsedMove = {
  raw: string
  face: Face
  turns: 1 | -1 | 2
}

export function parseMove(raw: string): ParsedMove | null {
  const match = /^([URFDLB])(['2]?)$/.exec(raw)
  if (!match) return null
  const face = match[1] as Face
  const suffix = match[2]
  const turns = suffix === "'" ? -1 : suffix === '2' ? 2 : 1
  return { raw, face, turns }
}
