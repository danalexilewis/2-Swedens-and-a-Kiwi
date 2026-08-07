<script lang="ts">
	import { onMount } from 'svelte';
	import { useSvelteFlow } from '@xyflow/svelte';

	type Props = {
		/** Extra world-space padding beyond node boxes (e.g. radial ring labels). */
		worldPadding?: number;
		padding?: number;
		minZoom?: number;
		maxZoom?: number;
		/**
		 * Increment to reframe on the radial ring, slightly tighter than the
		 * initial fit. Ignored when ringCenter/ringOuter are missing.
		 */
		ringFocusTick?: number;
		ringCenter?: { x: number; y: number } | null;
		ringOuter?: number | null;
	};

	let {
		worldPadding = 40,
		padding = 0.2,
		minZoom = 0.08,
		maxZoom = 1.75,
		ringFocusTick = 0,
		ringCenter = null,
		ringOuter = null
	}: Props = $props();

	const { getNodes, setViewport } = useSvelteFlow();

	/** How much tighter than a full-bounds fit when focusing the ring. */
	const RING_ZOOM_BOOST = 0.9;
	const RING_PAD = 64;
	const RING_FOCUS_DURATION = 320;

	function flowSize() {
		const flow = document.querySelector('.svelte-flow') as HTMLElement | null;
		return {
			width: flow?.clientWidth ?? 0,
			height: flow?.clientHeight ?? 0
		};
	}

	function frameAll() {
		const nodes = getNodes();
		if (!nodes.length) return false;

		const { width, height } = flowSize();
		if (width < 40 || height < 40) return false;

		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;

		for (const node of nodes) {
			const w = node.width ?? node.measured?.width ?? 110;
			const h = node.height ?? node.measured?.height ?? 28;
			minX = Math.min(minX, node.position.x);
			minY = Math.min(minY, node.position.y);
			maxX = Math.max(maxX, node.position.x + w);
			maxY = Math.max(maxY, node.position.y + h);
		}

		minX -= worldPadding;
		minY -= worldPadding;
		maxX += worldPadding;
		maxY += worldPadding;

		const boundsW = Math.max(maxX - minX, 1);
		const boundsH = Math.max(maxY - minY, 1);
		const zoom = Math.max(
			minZoom,
			Math.min(
				maxZoom,
				Math.min(
					width / (boundsW * (1 + padding * 2)),
					height / (boundsH * (1 + padding * 2))
				)
			)
		);

		void setViewport({
			x: width / 2 - (minX + boundsW / 2) * zoom,
			y: height / 2 - (minY + boundsH / 2) * zoom,
			zoom
		});
		return true;
	}

	function frameRing() {
		if (!ringCenter || ringOuter == null || ringOuter <= 0) return false;

		const { width, height } = flowSize();
		if (width < 40 || height < 40) return false;

		const size = (ringOuter + RING_PAD) * 2;
		const zoom = Math.max(
			minZoom,
			Math.min(maxZoom, Math.min(width / size, height / size) * RING_ZOOM_BOOST)
		);

		void setViewport(
			{
				x: width / 2 - ringCenter.x * zoom,
				y: height / 2 - ringCenter.y * zoom,
				zoom
			},
			{ duration: RING_FOCUS_DURATION }
		);
		return true;
	}

	let lastRingFocusTick = -1;
	let ringFocusPrimed = false;

	$effect(() => {
		const tick = ringFocusTick;
		// Skip the first run so remounts (view-mode key) don't re-zoom from a stale tick.
		if (!ringFocusPrimed) {
			ringFocusPrimed = true;
			lastRingFocusTick = tick;
			return;
		}
		if (!tick || tick === lastRingFocusTick) return;
		lastRingFocusTick = tick;
		// Defer one frame so layout/dialog open don't fight the camera.
		requestAnimationFrame(() => {
			frameRing();
		});
	});

	onMount(() => {
		let cancelled = false;
		let tries = 0;

		function tryFrame() {
			if (cancelled) return;
			tries += 1;
			if (frameAll()) {
				requestAnimationFrame(() => {
					if (!cancelled) frameAll();
				});
				return;
			}
			if (tries < 40) setTimeout(tryFrame, 50);
		}

		tryFrame();

		// store.fitView is unreliable here (queues without resolving), so hijack the
		// Controls fit button and use setViewport instead.
		const root = document.querySelector('.svelte-flow');
		function onClick(e: Event) {
			const target = e.target as HTMLElement | null;
			if (target?.closest('.svelte-flow__controls-fitview')) {
				e.preventDefault();
				e.stopPropagation();
				frameAll();
			}
		}
		root?.addEventListener('click', onClick, true);

		return () => {
			cancelled = true;
			root?.removeEventListener('click', onClick, true);
		};
	});
</script>
