<script lang="ts">
	import { marked } from 'marked';
	import type { ArchiveFile } from './loadArchive';

	type Props = {
		file: ArchiveFile | null;
		onclose: () => void;
	};

	let { file, onclose }: Props = $props();

	const html = $derived(
		file ? (marked.parse(file.body, { async: false }) as string) : ''
	);

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}

	function onbackdrop(e: MouseEvent) {
		if (e.target === e.currentTarget) onclose();
	}
</script>

<svelte:window {onkeydown} />

{#if file}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="backdrop" onclick={onbackdrop} role="presentation">
		<div
			class="dialog"
			role="dialog"
			aria-modal="true"
			aria-labelledby="file-dialog-title"
			tabindex="-1"
		>
			<header class="header">
				<div class="meta">
					<h2 id="file-dialog-title">{file.title}</h2>
					<p class="path">{file.path}</p>
				</div>
				<button type="button" class="close" onclick={onclose} aria-label="Close"
					>×</button
				>
			</header>
			<div class="body prose-md">
				{@html html}
			</div>
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
		width: min(720px, 100%);
		max-height: min(85vh, 900px);
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
	}
</style>
