export const FOLDER_COLORS: Record<string, string> = {
  root: '#94a3b8',
  book: '#60a5fa',
  topics: '#34d399',
  chapters: '#f472b6',
  scenes: '#fbbf24',
  sources: '#a78bfa',
  inbox: '#fb923c',
  'legal-review': '#f87171',
  'memoir-vault': '#2dd4bf'
}

export function folderColor(folder: string): string {
  return FOLDER_COLORS[folder] ?? '#94a3b8'
}
