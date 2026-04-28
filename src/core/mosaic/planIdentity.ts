import { targetKey } from '../cube'
import type { GeneratedCubeGroup, MosaicPlan } from '../../types'

function hashText(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

export function hashMosaicPlan(plan: MosaicPlan): string {
  const parts = [
    plan.rows,
    plan.cols,
    ...plan.cubes.map((cube) => [
      targetKey(cube.outputFace),
      cube.displayFace,
      cube.mountRotation,
      cube.buildMoves.join(' '),
    ].join(':')),
  ]
  return hashText(parts.join('|'))
}

export function buildCubeToGroupIndex(groups: GeneratedCubeGroup[]): Map<number, string> {
  const out = new Map<number, string>()
  for (const group of groups) {
    for (const index of group.indices) {
      out.set(index, group.id)
    }
  }
  return out
}
