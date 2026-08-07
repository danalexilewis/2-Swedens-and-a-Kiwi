<script lang="ts">
	import { Handle, Position, type NodeProps, type Node } from '@xyflow/svelte';
	import { folderColor } from './colors';
	import type { ViewMode } from './layout';

	type FileData = {
		title: string;
		path: string;
		folder: string;
		angle?: number;
		viewMode?: ViewMode;
		dimmed?: boolean;
		emphasized?: boolean;
		connected?: boolean;
	};

	type FileNodeType = Node<FileData, 'file'>;

	let { data }: NodeProps<FileNodeType> = $props();

	const accent = $derived(folderColor(data.folder));
	const opacity = $derived(
		data.dimmed ? 0.18 : data.emphasized || data.connected ? 1 : 0.92
	);
	const scale = $derived(data.emphasized ? 1.06 : 1);

	const handlePosition = $derived(
		(() => {
			if (data.viewMode === 'hierarchy') return Position.Bottom;
			const a = data.angle ?? 0;
			const deg = ((a * 180) / Math.PI + 360) % 360;
			if (deg >= 315 || deg < 45) return Position.Left;
			if (deg >= 45 && deg < 135) return Position.Top;
			if (deg >= 135 && deg < 225) return Position.Right;
			return Position.Bottom;
		})()
	);
</script>

<div
	class="file-node"
	class:emphasized={data.emphasized}
	class:connected={data.connected}
	style:opacity
	style:border-color={accent}
	style:transform={`scale(${scale})`}
	title={data.path}
>
	<Handle type="target" position={handlePosition} class="handle" />
	<Handle
		type="source"
		position={data.viewMode === 'hierarchy' ? Position.Top : handlePosition}
		class="handle"
	/>
	<span class="swatch" style:background={accent}></span>
	<span class="title">{data.title}</span>
</div>

<style>
	.file-node {
		width: 110px;
		min-height: 24px;
		padding: 3px 5px 3px 4px;
		border-radius: 4px;
		border: 1px solid;
		background: #1a1d24;
		box-sizing: border-box;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 4px;
		transition:
			opacity 140ms ease,
			transform 140ms ease,
			background 140ms ease;
	}

	.file-node:hover,
	.file-node.emphasized {
		background: #22262f;
	}

	.file-node.emphasized {
		outline: 1px solid rgba(255, 255, 255, 0.35);
		outline-offset: 1px;
	}

	.swatch {
		width: 4px;
		align-self: stretch;
		border-radius: 1px;
		flex-shrink: 0;
		min-height: 0.9em;
	}

	.title {
		font-size: 6px;
		font-weight: 500;
		color: #e8eaed;
		line-height: 1.2;
		word-break: break-word;
	}

	:global(.handle) {
		width: 4px !important;
		height: 4px !important;
		min-width: 4px !important;
		min-height: 4px !important;
		background: transparent !important;
		border: none !important;
	}
</style>
