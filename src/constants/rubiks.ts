import type { MountRotation, RubikColor } from '../types'

export const RUBIK_COLOR_NAMES: Record<RubikColor, string> = {
  W: 'white',
  Y: 'yellow',
  R: 'red',
  O: 'orange',
  B: 'blue',
  G: 'green',
}

export const MOUNT_COPY: Record<MountRotation, string> = {
  0: 'No wall rotation',
  90: 'Rotate this solved cube 90° clockwise when mounting it in the wall',
  180: 'Rotate this solved cube 180° when mounting it in the wall',
  270: 'Rotate this solved cube 90° counter-clockwise when mounting it in the wall',
}

export const PDF_MOUNT_COPY: Record<MountRotation, string> = {
  0: 'No wall rotation',
  90: 'Mount rotated 90 deg clockwise',
  180: 'Mount rotated 180 deg',
  270: 'Mount rotated 90 deg counter-clockwise',
}
