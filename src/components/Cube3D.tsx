import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useReducer, useRef } from 'react'
import { Group } from 'three'
import { applyMoves, FACE_COLORS } from '../core/cube'
import type { Face } from '../core/cube'
import { cubieKey, cubieOnFace, rotationAngle, rotationAxis, STICKERS_BY_CUBIE } from '../core/cube/cubies'
import type { Vec3 } from '../core/cube/cubies'
import { parseMove } from '../core/cube/moves'

const INTERIOR_COLOR = '#161616'
const CUBIE_SIZE = 0.94
const MATERIAL_SLOTS = [
  { id: 'right', index: 0 },
  { id: 'left', index: 1 },
  { id: 'top', index: 2 },
  { id: 'bottom', index: 3 },
  { id: 'front', index: 4 },
  { id: 'back', index: 5 },
] as const

const ALL_CUBIES: readonly Vec3[] = (() => {
  const out: Vec3[] = []
  for (const x of [-1, 0, 1] as const) {
    for (const y of [-1, 0, 1] as const) {
      for (const z of [-1, 0, 1] as const) {
        if (x !== 0 || y !== 0 || z !== 0) out.push([x, y, z])
      }
    }
  }
  return out
})()

type Cubie = { key: string; position: Vec3; colors: (string | null)[] }

function colorsForState(state: string): Map<string, (string | null)[]> {
  const out = new Map<string, (string | null)[]>()
  for (const [x, y, z] of ALL_CUBIES) {
    const key = cubieKey(x, y, z)
    const stickers = STICKERS_BY_CUBIE[key] ?? []
    const faces: (string | null)[] = [null, null, null, null, null, null]
    for (const sticker of stickers) {
      const letter = state[sticker.index] as Face
      const color = FACE_COLORS[letter] ?? '#888'
      const slot =
        sticker.normal[0] === 1
          ? 0
          : sticker.normal[0] === -1
            ? 1
            : sticker.normal[1] === 1
              ? 2
              : sticker.normal[1] === -1
                ? 3
                : sticker.normal[2] === 1
                  ? 4
                  : 5
      faces[slot] = color
    }
    out.set(key, faces)
  }
  return out
}

function buildCubies(state: string): Cubie[] {
  const colors = colorsForState(state)
  return ALL_CUBIES.map(([x, y, z]) => ({
    key: cubieKey(x, y, z),
    position: [x, y, z],
    colors: colors.get(cubieKey(x, y, z)) ?? [],
  }))
}

function CubieMesh({ position, colors }: { position: Vec3; colors: (string | null)[] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE]} />
      {MATERIAL_SLOTS.map((slot) => (
        <meshStandardMaterial
          key={slot.id}
          attach={`material-${slot.index}`}
          color={colors[slot.index] ?? INTERIOR_COLOR}
          roughness={0.55}
          metalness={0.05}
        />
      ))}
    </mesh>
  )
}

const ALL_MOVE_STRINGS = ['U', "U'", 'U2', 'R', "R'", 'R2', 'F', "F'", 'F2', 'D', "D'", 'D2', 'L', "L'", 'L2', 'B', "B'", 'B2']

function detectSingleMove(prev: string, next: string): string | null {
  if (prev === next) return null
  for (const move of ALL_MOVE_STRINGS) {
    if (applyMoves(prev, move) === next) return move
  }
  return null
}

type AnimatingTurn = {
  face: Face
  turns: 1 | -1 | 2
  endState: string
  startState: string
  durationMs: number
}

type SceneAnimationState = {
  rendered: string
  turn: AnimatingTurn | null
  startedAt: number
  queuedState: string | null
}

type SceneAnimationAction =
  | { type: 'sync'; state: string; now: number }
  | { type: 'done' }

export function sceneAnimationReducer(current: SceneAnimationState, action: SceneAnimationAction): SceneAnimationState {
  if (action.type === 'done') {
    if (!current.turn) return current
    return { rendered: current.queuedState ?? current.turn.endState, turn: null, startedAt: 0, queuedState: null }
  }

  if (action.state === current.rendered) return current
  if (current.turn) return { ...current, queuedState: action.state }
  const move = detectSingleMove(current.rendered, action.state)
  const parsed = move ? parseMove(move) : null
  if (!parsed) return { rendered: action.state, turn: null, startedAt: 0, queuedState: null }

  return {
    rendered: current.rendered,
    startedAt: action.now,
    queuedState: null,
    turn: {
      face: parsed.face,
      turns: parsed.turns,
      startState: current.rendered,
      endState: action.state,
      durationMs: parsed.turns === 2 ? 380 : 240,
    },
  }
}

function RotatingLayer({
  turn,
  startedAt,
  onDone,
}: {
  turn: AnimatingTurn
  startedAt: number
  onDone: () => void
}) {
  const groupRef = useRef<Group>(null)
  const axis = rotationAxis(turn.face)
  const targetAngle = rotationAngle(turn.face, turn.turns)

  useFrame(() => {
    const group = groupRef.current
    if (!group) return
    const t = Math.min(1, (performance.now() - startedAt) / turn.durationMs)
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    const angle = eased * targetAngle
    group.rotation.x = axis === 'x' ? angle : 0
    group.rotation.y = axis === 'y' ? angle : 0
    group.rotation.z = axis === 'z' ? angle : 0
    if (t >= 1) onDone()
  })

  const cubies = buildCubies(turn.startState).filter((cubie) => cubieOnFace(turn.face, cubie.position))

  return (
    <group ref={groupRef}>
      {cubies.map((cubie) => (
        <CubieMesh key={cubie.key} position={cubie.position} colors={cubie.colors} />
      ))}
    </group>
  )
}

function Scene({ state, autoRotate = false }: { state: string; autoRotate?: boolean }) {
  const [{ rendered, turn, startedAt }, dispatch] = useReducer(sceneAnimationReducer, state, (initialState) => ({
    rendered: initialState,
    turn: null,
    startedAt: 0,
    queuedState: null,
  }))

  useEffect(() => {
    dispatch({ type: 'sync', state, now: performance.now() })
  }, [state])

  function handleAnimationDone() {
    dispatch({ type: 'done' })
  }

  const staticState = turn ? turn.startState : rendered
  const allStatic = useMemo(() => buildCubies(staticState), [staticState])
  const filteredStatic = turn ? allStatic.filter((cubie) => !cubieOnFace(turn.face, cubie.position)) : allStatic

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} />
      <directionalLight position={[-3, -2, -4]} intensity={0.25} />
      {filteredStatic.map((cubie) => (
        <CubieMesh key={cubie.key} position={cubie.position} colors={cubie.colors} />
      ))}
      {turn && <RotatingLayer turn={turn} startedAt={startedAt} onDone={handleAnimationDone} />}
      <OrbitControls enablePan={false} enableZoom={false} autoRotate={autoRotate} autoRotateSpeed={2.2} minDistance={5} maxDistance={14} />
    </>
  )
}

export function Cube3D({ state, autoRotate = false }: { state: string; autoRotate?: boolean }) {
  return (
    <Canvas
      camera={{ position: [5.5, 5, 7], fov: 35 }}
      dpr={[1, 1.5]}
      style={{ background: '#fff7e6' }}
    >
      <Scene state={state} autoRotate={autoRotate} />
    </Canvas>
  )
}
