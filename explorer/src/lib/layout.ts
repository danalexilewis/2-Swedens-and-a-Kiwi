import type { ArchiveFile } from './loadArchive'
import { folderColor } from './colors'

export type PositionedFile = ArchiveFile & {
  position: { x: number; y: number }
  angle?: number
}

export type FolderZone = {
  folder: string
  color: string
  /** Start angle in radians (0 = east, CCW). */
  startAngle: number
  endAngle: number
  midAngle: number
  count: number
}

export type RingLayout = {
  files: PositionedFile[]
  zones: FolderZone[]
  center: { x: number; y: number }
  nodeRadius: number
  ringInner: number
  ringOuter: number
}

export type HierarchyBand = {
  folder: string
  color: string
  y: number
  label: string
}

export type HierarchyLayout = {
  files: PositionedFile[]
  bands: HierarchyBand[]
}

export type ViewMode = 'radial' | 'hierarchy'

export const FOLDER_ORDER = [
  'root',
  'book',
  'topics',
  'chapters',
  'scenes',
  'sources',
  'inbox',
  'legal-review',
  'memoir-vault'
]

/** Folders below chapters in the hierarchy view (chapters are always the top band). */
export const HIERARCHY_BELOW = [
  'book',
  'topics',
  'scenes',
  'sources',
  'inbox',
  'legal-review',
  'root',
  'memoir-vault'
]

const NODE_W = 110
const NODE_H = 28

// Radial geometry
const BASE_RADIUS = 945
const RING_GAP = 72
const RING_WIDTH = 40
const SECTOR_GAP = 0.045
const MIN_ARC_SPACING = 40
const CENTER = { x: 0, y: 0 }

const H_COL_GAP = 200
const H_ROW_GAP = 80
const H_NODE_GAP = 130

/**
 * Place nodes on a circle, clustered by folder along the circumference.
 */
export function layoutRing(files: ArchiveFile[]): RingLayout {
  const groups = groupFiles(files)
  const folders = orderedFolders(groups)

  const total = files.length || 1
  const gapTotal = SECTOR_GAP * folders.length
  const usable = Math.PI * 2 - gapTotal
  const nodeRadius = Math.max(BASE_RADIUS, (total * MIN_ARC_SPACING) / usable)

  let cursor = -Math.PI / 2
  const zones: FolderZone[] = []
  const positioned: PositionedFile[] = []

  for (const folder of folders) {
    const list = groups.get(folder) ?? []
    const span = (list.length / total) * usable
    const startAngle = cursor
    const endAngle = cursor + span
    const midAngle = (startAngle + endAngle) / 2

    zones.push({
      folder,
      color: folderColor(folder),
      startAngle,
      endAngle,
      midAngle,
      count: list.length
    })

    const innerPad = span * 0.08
    const placeStart = startAngle + innerPad
    const placeEnd = endAngle - innerPad
    const placeSpan = Math.max(placeEnd - placeStart, 0.001)

    list.forEach((file, i) => {
      const t = list.length === 1 ? 0.5 : i / (list.length - 1)
      const angle = placeStart + t * placeSpan
      positioned.push({
        ...file,
        angle,
        position: {
          x: CENTER.x + Math.cos(angle) * nodeRadius - NODE_W / 2,
          y: CENTER.y + Math.sin(angle) * nodeRadius - NODE_H / 2
        }
      })
    })

    cursor = endAngle + SECTOR_GAP
  }

  return {
    files: positioned,
    zones,
    center: CENTER,
    nodeRadius,
    ringInner: nodeRadius + RING_GAP,
    ringOuter: nodeRadius + RING_GAP + RING_WIDTH
  }
}

/**
 * Chapters on the top row; every other folder in bands below.
 */
export function layoutHierarchy(files: ArchiveFile[]): HierarchyLayout {
  const groups = groupFiles(files)
  const positioned: PositionedFile[] = []
  const bands: HierarchyBand[] = []

  const chapters = groups.get('chapters') ?? []
  placeRow(positioned, chapters, 0)
  bands.push({
    folder: 'chapters',
    color: folderColor('chapters'),
    y: -28,
    label: 'chapters'
  })

  let row = 1
  for (const folder of HIERARCHY_BELOW) {
    const list = groups.get(folder)
    if (!list?.length) continue
    const y = row * H_ROW_GAP
    placeRow(positioned, list, y)
    bands.push({
      folder,
      color: folderColor(folder),
      y: y - 28,
      label: folder
    })
    row += 1
  }

  // Any unexpected folders
  for (const [folder, list] of groups) {
    if (folder === 'chapters' || HIERARCHY_BELOW.includes(folder)) continue
    const y = row * H_ROW_GAP
    placeRow(positioned, list, y)
    bands.push({
      folder,
      color: folderColor(folder),
      y: y - 28,
      label: folder
    })
    row += 1
  }

  return { files: positioned, bands }
}

function placeRow(out: PositionedFile[], list: ArchiveFile[], y: number) {
  const sorted = [...list].sort((a, b) => a.path.localeCompare(b.path))
  const width = Math.max(sorted.length - 1, 0) * H_NODE_GAP
  const startX = -width / 2
  sorted.forEach((file, i) => {
    out.push({
      ...file,
      position: {
        x: startX + i * H_NODE_GAP,
        y
      }
    })
  })
}

function groupFiles(files: ArchiveFile[]) {
  const groups = new Map<string, ArchiveFile[]>()
  for (const file of files) {
    const list = groups.get(file.folder) ?? []
    list.push(file)
    groups.set(file.folder, list)
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.path.localeCompare(b.path))
  }
  return groups
}

function orderedFolders(groups: Map<string, ArchiveFile[]>) {
  return [
    ...FOLDER_ORDER.filter((f) => groups.has(f)),
    ...[...groups.keys()].filter((f) => !FOLDER_ORDER.includes(f)).sort()
  ]
}

export function polar(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + Math.cos(angle) * r,
    y: cy + Math.sin(angle) * r
  }
}

export function sectorPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
): string {
  const large = endAngle - startAngle > Math.PI ? 1 : 0
  const os = polar(cx, cy, outerR, startAngle)
  const oe = polar(cx, cy, outerR, endAngle)
  const ie = polar(cx, cy, innerR, endAngle)
  const is = polar(cx, cy, innerR, startAngle)

  return [
    `M ${os.x} ${os.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y}`,
    `L ${ie.x} ${ie.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${is.x} ${is.y}`,
    'Z'
  ].join(' ')
}

export { NODE_W, NODE_H, H_COL_GAP }
