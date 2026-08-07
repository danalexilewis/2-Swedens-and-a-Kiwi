<script lang="ts">
	import { marked } from 'marked';
	import type { ArchiveFile } from './loadArchive';
	import { folderColor } from './colors';
	import { FOLDER_ORDER } from './layout';
	import { fuzzyScoreFields } from './fuzzy';

	type Props = {
		open: boolean;
		files: ArchiveFile[];
		onselect: (id: string) => void;
		onclose: () => void;
	};

	let { open, files, onselect, onclose }: Props = $props();

	let query = $state('');
	let folderFilter = $state('all');

	const folders = $derived.by(() => {
		const present = new Set(files.map((f) => f.folder));
		const ordered = FOLDER_ORDER.filter((f) => present.has(f));
		const extras = [...present].filter((f) => !FOLDER_ORDER.includes(f)).sort();
		return [...ordered, ...extras];
	});

	const visibleFiles = $derived.by(() => {
		const typed =
			folderFilter === 'all'
				? files
				: files.filter((f) => f.folder === folderFilter);

		const q = query.trim();
		if (!q) return typed;

		return typed
			.map((file) => ({
				file,
				score: fuzzyScoreFields(q, [
					file.title,
					file.path,
					file.folder,
					file.body.slice(0, 2000)
				])
			}))
			.filter((row) => row.score > 0)
			.sort((a, b) => b.score - a.score)
			.map((row) => row.file);
	});

	$effect(() => {
		if (!open) {
			query = '';
			folderFilter = 'all';
		}
	});

	function cardHtml(file: ArchiveFile): string {
		return marked.parse(file.body, { async: false }) as string;
	}

	function onbackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}

	function onCardClick(id: string) {
		onselect(id);
	}

	function onCardKeydown(e: KeyboardEvent, id: string) {
		if (e.key === 'Enter') {
			e.preventDefault();
			onselect(id);
		}
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="backdrop" onclick={onbackdrop} role="presentation">
		<div
			class="gallery"
			role="dialog"
			aria-modal="true"
			aria-label="File card gallery"
		>
			<header class="chrome-bar">
				<div class="filters">
					<input
						class="search"
						type="search"
						placeholder="Fuzzy search title, path, body…"
						bind:value={query}
						spellcheck="false"
						aria-label="Fuzzy search cards"
					/>
					<select
						class="type"
						bind:value={folderFilter}
						aria-label="Filter by type"
					>
						<option value="all">All types</option>
						{#each folders as folder}
							<option value={folder}>{folder}</option>
						{/each}
					</select>
					<span class="count"
						>{visibleFiles.length}
						{visibleFiles.length === 1 ? 'card' : 'cards'}</span
					>
				</div>
				<div class="chrome-right">
					<span class="hint">Space to close · click a card to open</span>
					<button
						type="button"
						class="close"
						onclick={onclose}
						aria-label="Close">×</button
					>
				</div>
			</header>
			<div class="scroll">
				{#if visibleFiles.length === 0}
					<p class="empty">No cards match.</p>
				{:else}
					<div class="masonry">
						{#each visibleFiles as file (file.id)}
							<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
							<article
								class="card"
								style:border-left-color={folderColor(file.folder)}
								role="button"
								tabindex="0"
								onclick={() => onCardClick(file.id)}
								onkeydown={(e) => onCardKeydown(e, file.id)}
							>
								<header class="card-header">
									<h3 class="title">{file.title}</h3>
									<p class="path">{file.path}</p>
								</header>
								<div class="card-body prose-md">
									{@html cardHtml(file)}
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: rgba(0, 0, 0, 0.55);
		display: flex;
		align-items: stretch;
		justify-content: center;
		padding: 1.25rem 1.5rem 1.5rem;
	}

	.gallery {
		width: min(1400px, 100%);
		display: flex;
		flex-direction: column;
		min-height: 0;
		max-height: 100%;
	}

	.chrome-bar {
		flex-shrink: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem 1rem;
		padding: 0.35rem 0.25rem 0.85rem;
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.65rem;
		min-width: 0;
		flex: 1;
	}

	.search {
		flex: 1;
		min-width: 12rem;
		max-width: 28rem;
		background: #16191f;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 6px;
		color: #e8eaed;
		padding: 0.4rem 0.65rem;
		font: inherit;
		font-size: 0.85rem;
	}

	.search:focus {
		outline: none;
		border-color: rgba(255, 255, 255, 0.35);
	}

	.type {
		background: #16191f;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 6px;
		color: #e8eaed;
		padding: 0.4rem 0.55rem;
		font: inherit;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.type:focus {
		outline: none;
		border-color: rgba(255, 255, 255, 0.35);
	}

	.count {
		font-size: 0.75rem;
		color: rgba(232, 234, 237, 0.45);
		white-space: nowrap;
	}

	.chrome-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-shrink: 0;
	}

	.hint {
		font-size: 0.75rem;
		color: rgba(232, 234, 237, 0.5);
	}

	.close {
		border: none;
		background: transparent;
		color: rgba(232, 234, 237, 0.7);
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
		padding: 0 0.25rem;
	}

	.close:hover {
		color: #fff;
	}

	.scroll {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding-bottom: 0.5rem;
	}

	.empty {
		margin: 3rem auto;
		text-align: center;
		color: rgba(232, 234, 237, 0.45);
		font-size: 0.9rem;
	}

	.masonry {
		column-count: 4;
		column-gap: 0.85rem;
	}

	@media (max-width: 1100px) {
		.masonry {
			column-count: 3;
		}
	}

	@media (max-width: 800px) {
		.masonry {
			column-count: 2;
		}
	}

	@media (max-width: 520px) {
		.masonry {
			column-count: 1;
		}
	}

	.card {
		break-inside: avoid;
		-webkit-column-break-inside: avoid;
		page-break-inside: avoid;
		display: flex;
		flex-direction: column;
		margin: 0 0 0.85rem;
		background: #16191f;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-left: 3px solid #94a3b8;
		border-radius: 10px;
		overflow: hidden;
		cursor: pointer;
		text-align: left;
		width: 100%;
		transition:
			border-color 120ms ease,
			background 120ms ease;
	}

	.card:hover,
	.card:focus-visible {
		background: #1a1e26;
		border-color: rgba(255, 255, 255, 0.22);
		outline: none;
	}

	.card-header {
		padding: 0.65rem 0.75rem 0.5rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		flex-shrink: 0;
	}

	.title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 650;
		line-height: 1.25;
	}

	.path {
		margin: 0.2rem 0 0;
		font-size: 0.65rem;
		color: rgba(232, 234, 237, 0.45);
		font-family: ui-monospace, monospace;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.card-body {
		padding: 0.55rem 0.75rem 0.75rem;
		max-height: 400px;
		overflow: hidden;
		font-size: 0.72rem;
		line-height: 1.45;
		pointer-events: none;
	}

	.card-body :global(h1),
	.card-body :global(h2),
	.card-body :global(h3),
	.card-body :global(h4) {
		font-size: 0.85rem;
		margin: 0.65em 0 0.35em;
	}

	.card-body :global(p),
	.card-body :global(ul),
	.card-body :global(ol),
	.card-body :global(blockquote),
	.card-body :global(pre),
	.card-body :global(table) {
		margin: 0.45em 0;
	}
</style>
