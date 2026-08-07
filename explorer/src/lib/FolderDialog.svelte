<script lang="ts">
	import { marked } from 'marked';
	import { folderColor } from './colors';
	import type { FolderDescription } from './folderDescriptions';
	import type { DialogNavigation } from './ringNavigate';

	type Props = {
		folder: string | null;
		description: FolderDescription | null;
		navigation?: DialogNavigation | null;
		onclose: () => void;
	};

	let { folder, description, navigation = null, onclose }: Props = $props();

	const html = $derived(
		description
			? (marked.parse(description.body, { async: false }) as string)
			: ''
	);

	const canNavigate = $derived(
		navigation !== null && navigation !== undefined && navigation.total > 1
	);

	const swatch = $derived(folder ? folderColor(folder) : '#94a3b8');

	function goPrev() {
		navigation?.onPrev();
	}

	function goNext() {
		navigation?.onNext();
	}

	function onkeydown(e: KeyboardEvent) {
		if (!folder) return;
		if (e.key === 'Escape') {
			onclose();
			return;
		}
		if (!canNavigate || !navigation) return;
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			goPrev();
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			goNext();
		}
	}

	function onbackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}
</script>

<svelte:window {onkeydown} />

{#if folder && description}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="backdrop" onclick={onbackdrop} role="presentation">
		<div
			class="dialog"
			role="dialog"
			aria-modal="true"
			aria-labelledby="folder-dialog-title"
			tabindex="-1"
		>
			<header class="header">
				<div class="meta">
					<div class="title-row">
						<i class="swatch" style:background={swatch} aria-hidden="true"></i>
						<h2 id="folder-dialog-title">{description.title}</h2>
					</div>
					<p class="path">
						<span class="folder-id">{folder}</span>
						{#if canNavigate && navigation}
							<span class="position"
								>· {navigation.index + 1} / {navigation.total}</span
							>
						{/if}
					</p>
				</div>
				<button type="button" class="close" onclick={onclose} aria-label="Close"
					>×</button
				>
			</header>
			<div class="body prose-md">
				{@html html}
			</div>
			<footer class="footer">
				{#if canNavigate && navigation}
					<button
						type="button"
						class="nav"
						aria-label="Previous category (anticlockwise)"
						title="Previous (← anticlockwise)"
						onclick={() => goPrev()}
					>
						<span class="arrow" aria-hidden="true">‹</span>
					</button>
				{:else}
					<span class="footer-spacer"></span>
				{/if}

				<span class="hint">←→ category</span>

				{#if canNavigate && navigation}
					<button
						type="button"
						class="nav"
						aria-label="Next category (clockwise)"
						title="Next (→ clockwise)"
						onclick={() => goNext()}
					>
						<span class="arrow" aria-hidden="true">›</span>
					</button>
				{:else}
					<span class="footer-spacer"></span>
				{/if}
			</footer>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: rgba(0, 0, 0, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.dialog {
		width: min(520px, 100%);
		max-height: min(70vh, 640px);
		background: #16191f;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 10px;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		flex-shrink: 0;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.swatch {
		width: 10px;
		height: 10px;
		border-radius: 2px;
		flex-shrink: 0;
		display: inline-block;
	}

	.meta h2 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
	}

	.path {
		margin: 0.25rem 0 0;
		font-size: 0.75rem;
		color: rgba(232, 234, 237, 0.55);
		font-family: ui-monospace, monospace;
	}

	.folder-id {
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.position {
		color: rgba(232, 234, 237, 0.4);
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

	.body {
		padding: 1rem 1.25rem 1.5rem;
		overflow-y: auto;
		flex: 1;
		min-height: 0;
	}

	.footer {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 1rem 0.65rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.footer-spacer {
		width: 2rem;
		flex-shrink: 0;
	}

	.nav {
		flex-shrink: 0;
		width: 2rem;
		height: 2rem;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.18);
		background: rgba(255, 255, 255, 0.04);
		color: rgba(232, 234, 237, 0.85);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			background 120ms ease,
			border-color 120ms ease,
			color 120ms ease;
	}

	.nav:hover {
		background: #22262f;
		border-color: rgba(255, 255, 255, 0.35);
		color: #fff;
	}

	.arrow {
		font-size: 1.35rem;
		line-height: 1;
		margin-top: -0.05rem;
	}

	.hint {
		font-size: 0.7rem;
		color: rgba(232, 234, 237, 0.4);
		text-align: center;
		flex: 1;
	}
</style>
