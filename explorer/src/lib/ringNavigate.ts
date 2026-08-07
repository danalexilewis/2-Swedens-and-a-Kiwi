import type { PositionedFile } from './layout'
import type { ArchiveFile } from './loadArchive'

export type DialogNavigation = {
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
}

export type RingDirection = 'clockwise' | 'anticlockwise'

/**
 * File ids on the radial ring, sorted by angle (anticlockwise / increasing angle).
 */
export function ringFileOrder(files: PositionedFile[]): string[] {
  return [...files]
    .filter((f) => f.angle !== undefined)
    .sort((a, b) => a.angle! - b.angle!)
    .map((f) => f.id)
}

/**
 * Step around the ring. Right = clockwise, left = anticlockwise.
 */
export function adjacentOnRing(
  order: string[],
  currentId: string,
  direction: RingDirection
): string | null {
  if (order.length < 2) return null
  const idx = order.indexOf(currentId)
  if (idx === -1) return order[0] ?? null

  const delta = direction === 'anticlockwise' ? 1 : -1
  const next = (idx + delta + order.length) % order.length
  return order[next] ?? null
}
