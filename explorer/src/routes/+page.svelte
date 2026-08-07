<script lang="ts">
	import {
		SvelteFlow,
		Background,
		Controls,
		MiniMap,
		type Node,
		type Edge,
		type NodeTypes
	} from '@xyflow/svelte';
	import FileNode from '$lib/FileNode.svelte';
	import FileDialog from '$lib/FileDialog.svelte';
	import CardGallery from '$lib/CardGallery.svelte';
	import RingZones from '$lib/RingZones.svelte';
	import HierarchyBands from '$lib/HierarchyBands.svelte';
	import FitOnMount from '$lib/FitOnMount.svelte';
	import { layoutRing, layoutHierarchy, type ViewMode } from '$lib/layout';
	import { folderColor } from '$lib/colors';
	import {
		resolveFocus,
		togglePin,
		type FocusTarget,
		type FocusSets
	} from '$lib/focus';
	import { ringFileOrder, adjacentOnRing } from '$lib/ringNavigate';
	import type { DialogNavigation } from '$lib/ringNavigate';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const nodeTypes: NodeTypes = {
		file: FileNode
	};

	let filter = $state('');
	let readingId = $state<string | null>(null);
	let galleryOpen = $state(false);
	let viewMode = $state<ViewMode>('radial');
	let pinned = $state<FocusTarget>(null);
	let hovered = $state<FocusTarget>(null);

	const ring = $derived(layoutRing(data.files));
	const hierarchy = $derived(layoutHierarchy(data.files));
	const fileById = $derived(new Map(data.files.map((f) => [f.id, f])));

	const readingFile = $derived(
		readingId ? (fileById.get(readingId) ?? null) : null
	);

	const folders = $derived(
		viewMode === 'radial'
			? ring.zones.map((z) => z.folder)
			: hierarchy.bands.map((b) => b.folder)
	);

	const activeFocus = $derived(hovered ?? pinned);

	const focusSets = $derived(resolveFocus(activeFocus, data.files, data.edges));

	const activeFolder = $derived(
		activeFocus?.kind === 'folder' ? activeFocus.id : null
	);

	const pinnedFolder = $derived(pinned?.kind === 'folder' ? pinned.id : null);

	const positionedFiles = $derived(
		viewMode === 'radial' ? ring.files : hierarchy.files
	);

	function buildNodes(queryRaw: string, focus: FocusSets): Node[] {
		const query = queryRaw.trim().toLowerCase();
		const focusing = focus.members.size > 0;

		return positionedFiles.map((file) => {
			const filterDim =
				query.length > 0 &&
				!file.path.toLowerCase().includes(query) &&
				!file.title.toLowerCase().includes(query) &&
				!file.folder.toLowerCase().includes(query);

			const emphasized = focusing && focus.members.has(file.id);
			const connected = focusing && !emphasized && focus.linked.has(file.id);
			const dimmed = filterDim || (focusing && !emphasized && !connected);

			return {
				id: file.id,
				type: 'file' as const,
				position: file.position,
				width: 110,
				height: 28,
				data: {
					title: file.title,
					path: file.path,
					folder: file.folder,
					angle: file.angle,
					viewMode,
					dimmed,
					emphasized,
					connected
				},
				draggable: false,
				zIndex: emphasized ? 10 : connected ? 5 : 1
			};
		});
	}

	function buildEdges(focus: FocusSets): Edge[] {
		const focusing = focus.edgeIds.size > 0;
		const edgeType = viewMode === 'hierarchy' ? 'default' : 'straight';

		return data.edges.map((e) => {
			const active = focusing && focus.edgeIds.has(e.id);
			const sourceFolder = fileById.get(e.source)?.folder;
			const color = active
				? folderColor(focus.accentFolder ?? sourceFolder ?? 'root')
				: 'rgba(255,255,255,0.28)';

			return {
				id: e.id,
				source: e.source,
				target: e.target,
				type: edgeType,
				animated: active,
				style: active
					? `stroke: ${color}; stroke-width: 2.5; opacity: 1`
					: `stroke: ${color}; stroke-width: 1; opacity: ${focusing ? 0.22 : 0.55}`,
				zIndex: active ? 4 : 0
			};
		});
	}

	// Seed with a full layout so fitView does not run against an empty graph.
	let nodes = $state.raw<Node[]>(
		buildNodes('', resolveFocus(null, data.files, data.edges))
	);
	let edges = $state.raw<Edge[]>(
		buildEdges(resolveFocus(null, data.files, data.edges))
	);

	$effect(() => {
		const focus = focusSets;
		void viewMode;
		void positionedFiles;
		nodes = buildNodes(filter, focus);
		edges = buildEdges(focus);
	});

	function pinTarget(next: FocusTarget) {
		pinned = togglePin(pinned, next);
	}

	function onnodeclick({
		node,
		event
	}: {
		node: Node;
		event: MouseEvent | TouchEvent;
	}) {
		event.stopPropagation?.();
		const wasPinned = pinned?.kind === 'node' && pinned.id === node.id;
		pinTarget({ kind: 'node', id: node.id });
		if (wasPinned) {
			readingId = null;
		} else {
			readingId = node.id;
		}
	}

	function onnodepointerenter({ node }: { node: Node }) {
		hovered = { kind: 'node', id: node.id };
	}

	function onnodepointerleave() {
		if (hovered?.kind === 'node') hovered = null;
	}

	function onpaneclick() {
		pinned = null;
		hovered = null;
	}

	function closeDialog() {
		readingId = null;
	}

	function filePassesFilter(file: {
		path: string;
		title: string;
		folder: string;
	}) {
		const query = filter.trim().toLowerCase();
		if (!query) return true;
		return (
			file.path.toLowerCase().includes(query) ||
			file.title.toLowerCase().includes(query) ||
			file.folder.toLowerCase().includes(query)
		);
	}

	function isTypingTarget(target: EventTarget | null) {
		if (!(target instanceof HTMLElement)) return false;
		const tag = target.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
		return target.isContentEditable;
	}

	function onGlobalKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			if (readingId) return;
			if (galleryOpen) {
				e.preventDefault();
				galleryOpen = false;
			}
			return;
		}

		if (e.key !== ' ' && e.code !== 'Space') return;
		if (isTypingTarget(e.target)) return;
		if (e.repeat) return;
		e.preventDefault();
		galleryOpen = !galleryOpen;
	}

	function onGallerySelect(id: string) {
		readingId = id;
		pinned = { kind: 'node', id };
	}

	const ringNavOrder = $derived(
		viewMode === 'radial'
			? ringFileOrder(ring.files.filter((f) => filePassesFilter(f)))
			: []
	);

	const dialogNavigation = $derived.by((): DialogNavigation | null => {
		if (viewMode !== 'radial' || !readingId || ringNavOrder.length < 2)
			return null;
		const index = ringNavOrder.indexOf(readingId);
		if (index === -1) return null;
		return {
			index,
			total: ringNavOrder.length,
			onPrev: () => navigateRing('anticlockwise'),
			onNext: () => navigateRing('clockwise')
		};
	});

	function navigateRing(direction: 'clockwise' | 'anticlockwise') {
		if (!readingId || ringNavOrder.length < 2) return;
		const nextId = adjacentOnRing(ringNavOrder, readingId, direction);
		if (!nextId) return;
		readingId = nextId;
		pinned = { kind: 'node', id: nextId };
	}

	function onZoneHover(folder: string | null) {
		hovered = folder ? { kind: 'folder', id: folder } : null;
	}

	function onLegendEnter(folder: string) {
		hovered = { kind: 'folder', id: folder };
	}

	function onLegendLeave() {
		if (hovered?.kind === 'folder') hovered = null;
	}

	function onLegendClick(folder: string) {
		pinTarget({ kind: 'folder', id: folder });
	}

	function setView(mode: ViewMode) {
		if (viewMode === mode) return;
		viewMode = mode;
		pinned = null;
		hovered = null;
		// Rebuild for the new layout before {#key viewMode} remounts SvelteFlow,
		// so fitView frames the whole graph instead of the previous layout.
		const focus = resolveFocus(null, data.files, data.edges);
		nodes = buildNodes(filter, focus);
		edges = buildEdges(focus);
	}
</script>

<div class="shell">
	<div class="chrome">
		<div class="brand">
			<strong>Two Swedens explorer</strong>
			<span class="count"
				>{data.files.length} files · {data.edges.length} links · hover ring / click
				node to pin · Space for cards</span
			>
		</div>

		<div class="views" role="group" aria-label="Layout">
			<button
				type="button"
				class:active={viewMode === 'radial'}
				onclick={() => setView('radial')}>Radial</button
			>
			<button
				type="button"
				class:active={viewMode === 'hierarchy'}
				onclick={() => setView('hierarchy')}>Hierarchy</button
			>
		</div>

		<input
			class="filter"
			type="search"
			placeholder="Filter by path, title, folder…"
			bind:value={filter}
			spellcheck="false"
		/>
		<div class="legend">
			{#each folders as folder}
				<button
					type="button"
					class="legend-item"
					class:active={activeFolder === folder || pinnedFolder === folder}
					onpointerenter={() => onLegendEnter(folder)}
					onpointerleave={onLegendLeave}
					onclick={() => onLegendClick(folder)}
				>
					<i style:background={folderColor(folder)}></i>
					{folder}
				</button>
			{/each}
		</div>
	</div>

	<div class="canvas">
		{#key viewMode}
			<SvelteFlow
				bind:nodes
				bind:edges
				{nodeTypes}
				colorMode="dark"
				nodesDraggable={false}
				nodesConnectable={false}
				elementsSelectable={true}
				panOnScroll
				zoomOnScroll
				minZoom={0.08}
				maxZoom={1.75}
				proOptions={{ hideAttribution: true }}
				defaultEdgeOptions={{
					type: viewMode === 'hierarchy' ? 'default' : 'straight'
				}}
				{onnodeclick}
				{onnodepointerenter}
				{onnodepointerleave}
				{onpaneclick}
			>
				<Background
					gap={24}
					bgColor="#0f1115"
					patternColor="rgba(255,255,255,0.03)"
				/>
				{#if viewMode === 'radial'}
					<RingZones layout={ring} {activeFolder} onhover={onZoneHover} />
				{:else}
					<HierarchyBands layout={hierarchy} />
				{/if}
				<FitOnMount worldPadding={viewMode === 'radial' ? 80 : 40} />
				<Controls />
				<MiniMap
					nodeColor={(n) =>
						folderColor(
							String(
								(n.data as { folder?: string } | undefined)?.folder ?? 'root'
							)
						)}
					maskColor="rgba(0,0,0,0.55)"
					bgColor="#12151a"
				/>
			</SvelteFlow>
		{/key}
	</div>
</div>

<svelte:window onkeydown={onGlobalKeydown} />

<CardGallery
	open={galleryOpen}
	files={data.files}
	onselect={onGallerySelect}
	onclose={() => (galleryOpen = false)}
/>

<FileDialog
	file={readingFile}
	navigation={dialogNavigation}
	onclose={closeDialog}
/>

<style>
	.shell {
		height: 100vh;
		width: 100vw;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.chrome {
		flex-shrink: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1rem;
		padding: 0.65rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		background: #12151a;
		z-index: 10;
	}

	.brand {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 11rem;
	}

	.brand strong {
		font-size: 0.9rem;
	}

	.count {
		font-size: 0.7rem;
		color: rgba(232, 234, 237, 0.5);
	}

	.views {
		display: inline-flex;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 6px;
		overflow: hidden;
	}

	.views button {
		appearance: none;
		border: none;
		background: transparent;
		color: rgba(232, 234, 237, 0.65);
		font-size: 0.75rem;
		padding: 0.4rem 0.75rem;
		cursor: pointer;
	}

	.views button.active {
		background: rgba(255, 255, 255, 0.1);
		color: #e8eaed;
	}

	.views button:not(.active):hover {
		background: rgba(255, 255, 255, 0.05);
		color: #e8eaed;
	}

	.filter {
		flex: 1;
		min-width: 12rem;
		max-width: 24rem;
		background: #1a1d24;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 6px;
		color: #e8eaed;
		padding: 0.45rem 0.7rem;
		font-size: 0.85rem;
	}

	.filter:focus {
		outline: 1px solid rgba(96, 165, 250, 0.6);
		border-color: transparent;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.55rem;
		margin-left: auto;
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.7rem;
		color: rgba(232, 234, 237, 0.65);
		padding: 0.2rem 0.45rem;
		border-radius: 4px;
		cursor: pointer;
		border: none;
		background: transparent;
		transition:
			background 120ms ease,
			color 120ms ease;
	}

	.legend-item:hover,
	.legend-item.active {
		background: rgba(255, 255, 255, 0.06);
		color: #e8eaed;
	}

	.legend-item i {
		width: 8px;
		height: 8px;
		border-radius: 2px;
		display: inline-block;
	}

	.canvas {
		flex: 1;
		min-height: 0;
	}

	.canvas :global(.svelte-flow) {
		width: 100%;
		height: 100%;
		background: #0f1115;
	}
</style>
