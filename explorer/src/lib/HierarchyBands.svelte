<script lang="ts">
	import { ViewportPortal } from '@xyflow/svelte';
	import type { HierarchyLayout } from './layout';

	type Props = {
		layout: HierarchyLayout;
	};

	let { layout }: Props = $props();
</script>

<ViewportPortal target="back">
	<svg
		width="1"
		height="1"
		style="overflow: visible; position: absolute; left: 0; top: 0; pointer-events: none;"
	>
		{#each layout.bands as band (band.folder)}
			<text
				x={0}
				y={band.y}
				fill={band.color}
				fill-opacity="0.85"
				font-size="9"
				font-weight="700"
				letter-spacing="0.06em"
				text-anchor="middle"
				style="text-transform: uppercase;"
			>
				{band.label}
			</text>
			<line
				x1={-900}
				y1={band.y + 14}
				x2={900}
				y2={band.y + 14}
				stroke={band.color}
				stroke-opacity="0.18"
				stroke-width="1"
			/>
		{/each}
	</svg>
</ViewportPortal>
