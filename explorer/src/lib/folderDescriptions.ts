import type { FolderZone } from './layout'

export type FolderDescription = {
	title: string
	body: string
}

const DESCRIPTIONS: Record<string, FolderDescription> = {
	root: {
		title: 'Root',
		body: `Top-level book identity and session files — \`BOOK.md\`, \`CURRENT.md\`, \`PARKING-LOT.md\`, \`VOICE.md\`, \`EVIDENCE-STANDARD.md\`, and the repo README. These change slowly and steer the writing process.`
	},
	book: {
		title: 'Book',
		body: `Core thesis material: argument map, claim ledger, chapter map, relationship types, key concepts, shared-failure framing, and open questions. The spine of the book's structure.`
	},
	topics: {
		title: 'Topics',
		body: `Comparative topic files (Sweden ↔ New Zealand). Each file develops a shared pattern with enough evidence to support the argument.`
	},
	chapters: {
		title: 'Chapters',
		body: `Draft chapters. Raw thought and topic work land here once they are ready to become prose.`
	},
	scenes: {
		title: 'Scenes',
		body: `Lived scenes for chapter openings — concrete moments that ground the comparative argument in experience.`
	},
	sources: {
		title: 'Sources',
		body: `Short source notes and an index. Not every PDF — just enough to keep claims credible and findable.`
	},
	inbox: {
		title: 'Inbox',
		body: `Unprocessed transcripts, notes, documents, and links. Material waits here until it is routed into topics, scenes, claims, or elsewhere.`
	},
	'legal-review': {
		title: 'Legal review',
		body: `Claims about identifiable people that need care before they appear in published prose.`
	},
	'memoir-vault': {
		title: 'Memoir vault',
		body: `Material better suited to a later memoir — personal enough to keep, not yet for the book's argument.`
	}
}

/**
 * Description for a folder category. Unknown folders get a generic fallback.
 */
export function getFolderDescription(folder: string): FolderDescription {
	return (
		DESCRIPTIONS[folder] ?? {
			title: folder,
			body: `Archive folder \`${folder}\`.`
		}
	)
}

/**
 * Category order matching the ring's angular zones (including extras).
 */
export function folderDescriptionOrder(zones: FolderZone[]): string[] {
	return zones.map((z) => z.folder)
}
