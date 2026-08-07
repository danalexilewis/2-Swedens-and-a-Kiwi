<script lang="ts">
	import { ViewportPortal } from '@xyflow/svelte';
	import {
		sectorPath,
		polar,
		type FolderZone,
		type RingLayout
	} from './layout';

	type Props = {
		layout: RingLayout;
		/** Folder currently previewed by hover (dims other arcs). */
		activeFolder: string | null;
		onhover: (folder: string | null) => void;
	};

	let { layout, activeFolder, onhover }: Props = $props();

	const { center, ringInner, ringOuter, zones } = $derived(layout);
	const labelR = $derived((ringInner + ringOuter) / 2);

	function labelPos(zone: FolderZone) {
		return polar(center.x, center.y, labelR, zone.midAngle);
	}

	function labelRotate(zone: FolderZone): number {
		let deg = (zone.midAngle * 180) / Math.PI;
		if (zone.midAngle > Math.PI / 2 || zone.midAngle < -Math.PI / 2) {
			deg += 180;
		}
		return deg;
	}
</script>

<ViewportPortal target="back">
	<svg
		class="ring-svg"
		width="1"
		height="1"
		style="overflow: visible; position: absolute; left: 0; top: 0; pointer-events: none;"
	>
		<circle
			cx={center.x}
			cy={center.y}
			r={layout.nodeRadius}
			fill="none"
			stroke="rgba(255,255,255,0.04)"
			stroke-width="1"
		/>

		{#each zones as zone (zone.folder)}
			{@const active = activeFolder === zone.folder}
			{@const dimmed = activeFolder !== null && !active}
			{@const lp = labelPos(zone)}
			<g class="zone" style:opacity={dimmed ? 0.28 : 1}>
				<path
					d={sectorPath(
						center.x,
						center.y,
						ringInner,
						ringOuter,
						zone.startAngle,
						zone.endAngle
					)}
					fill={zone.color}
					fill-opacity={active ? 0.85 : 0.55}
					stroke="rgba(15,17,21,0.65)"
					stroke-width="1"
					style="pointer-events: all; cursor: default;"
					role="img"
					aria-label="{zone.folder} zone, {zone.count} files"
					onpointerenter={() => onhover(zone.folder)}
					onpointerleave={() => onhover(null)}
				/>
				<text
					x={lp.x}
					y={lp.y}
					fill="#0f1115"
					font-size="10"
					font-weight="700"
					letter-spacing="0.04em"
					text-anchor="middle"
					dominant-baseline="middle"
					transform="rotate({labelRotate(zone)} {lp.x} {lp.y})"
					style="pointer-events: none; text-transform: uppercase;"
				>
					{zone.folder}
				</text>
			</g>
		{/each}
	</svg>
</ViewportPortal>
