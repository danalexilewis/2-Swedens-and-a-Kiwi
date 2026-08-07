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
	import FolderDialog from '$lib/FolderDialog.svelte';
	import CardGallery from '$lib/CardGallery.svelte';
	import RingZones from '$lib/RingZones.svelte';
	import HierarchyBands from '$lib/HierarchyBands.svelte';
	import FitOnMount from '$lib/FitOnMount.svelte';
	import {
		layoutRing,
		layoutHierarchy,
		FOLDER_ORDER,
		type ViewMode
	} from '$lib/layout';
	import { folderColor } from '$lib/colors';
	import {
		getFolderDescription,
		folderDescriptionOrder
	} from '$lib/folderDescriptions';
	import {
		resolveFocus,
		togglePin,
		type FocusTarget,
		type FocusSets
	} from '$lib/focus';
	import {
		RELATION_COLORS,
		RELATION_LABELS,
		RELATION_TYPES,
		type RelationType
	} from '$lib/relationTypes';
	import { ringFileOrder, adjacentOnRing } from '$lib/ringNavigate';
	import type { DialogNavigation } from '$lib/ringNavigate';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const nodeTypes: NodeTypes = {
		file: FileNode
	};

	let filter = $state('');
	let readingId = $state<string | null>(null);
	let readingFolder = $state<string | null>(null);
	let galleryOpen = $state(false);
	let viewMode = $state<ViewMode>('radial');
	let pinned = $state<FocusTarget>(null);
	let hovered = $state<FocusTarget>(null);
	/** Bumped when opening a category dialog so the camera reframes the ring. */
	let ringFocusTick = $state(0);
	let enabledRelations = $state<Record<RelationType, boolean>>(
		Object.fromEntries(
			RELATION_TYPES.map((t) => [t, t !== 'mentions'])
		) as Record<RelationType, boolean>
	);
	/** Archive folders removed from the ring/hierarchy layout this session. */
	let hiddenFolders = $state<Set<string>>(new Set());

	const visibleFiles = $derived(
		data.files.filter((f) => !hiddenFolders.has(f.folder))
	);
	const visibleFileIds = $derived(new Set(visibleFiles.map((f) => f.id)));

	const ring = $derived(layoutRing(visibleFiles));
	const hierarchy = $derived(layoutHierarchy(visibleFiles));
	const fileById = $derived(new Map(data.files.map((f) => [f.id, f])));

	const readingFile = $derived(
		readingId ? (fileById.get(readingId) ?? null) : null
	);

	const readingFolderDescription = $derived(
		readingFolder ? getFolderDescription(readingFolder) : null
	);

	/** Full archive folder list for the legend (includes hidden categories). */
	const folders = $derived.by(() => {
		const present = new Set(data.files.map((f) => f.folder));
		return [
			...FOLDER_ORDER.filter((f) => present.has(f)),
			...[...present].filter((f) => !FOLDER_ORDER.includes(f)).sort()
		];
	});

	const visibleFolderCount = $derived(
		folders.filter((f) => !hiddenFolders.has(f)).length
	);

	const visibleEdges = $derived(
		data.edges.filter(
			(e) =>
				enabledRelations[e.type] &&
				visibleFileIds.has(e.source) &&
				visibleFileIds.has(e.target)
		)
	);

	/**
	 * Graph highlight (node dim/emphasize + edge styles) is driven by *pin* only.
	 * Hover must not rebuild nodes/edges — that replaces every object identity,
	 * which re-fires pointerenter/leave under a moving viewport and loops.
	 */
	const focusSets = $derived(resolveFocus(pinned, visibleFiles, visibleEdges));

	/** Ring/legend preview: cheap SVG opacity, no graph rebuild. */
	const activeFolder = $derived(
		hovered?.kind === 'folder'
			? hovered.id
			: pinned?.kind === 'folder'
				? pinned.id
				: null
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

	function buildEdges(focus: FocusSets, edgesIn: typeof data.edges): Edge[] {
		const focusing = focus.edgeIds.size > 0;
		const edgeType = viewMode === 'hierarchy' ? 'default' : 'straight';

		return edgesIn.map((e) => {
			const active = focusing && focus.edgeIds.has(e.id);
			const color = RELATION_COLORS[e.type];

			return {
				id: e.id,
				source: e.source,
				target: e.target,
				type: edgeType,
				label:
					active && e.type !== 'mentions' ? RELATION_LABELS[e.type] : undefined,
				labelStyle: active
					? 'fill: #e8eaed; font-size: 9px; font-weight: 600'
					: undefined,
				labelBgStyle: active ? 'fill: #12151a; fill-opacity: 0.85' : undefined,
				animated: active,
				style: active
					? `stroke: ${color}; stroke-width: 2.5; opacity: 1`
					: `stroke: ${color}; stroke-width: ${e.type === 'mentions' ? 1 : 1.4}; opacity: ${focusing ? 0.22 : e.type === 'mentions' ? 0.45 : 0.7}`,
				zIndex: active ? 4 : e.type === 'mentions' ? 0 : 1
			};
		});
	}

	// Seed with a full layout so fitView does not run against an empty graph.
	let nodes = $state.raw<Node[]>(
		buildNodes('', resolveFocus(null, visibleFiles, visibleEdges))
	);
	let edges = $state.raw<Edge[]>(
		buildEdges(resolveFocus(null, visibleFiles, visibleEdges), visibleEdges)
	);

	$effect(() => {
		const focus = focusSets;
		void viewMode;
		void positionedFiles;
		void enabledRelations;
		void hiddenFolders;
		nodes = buildNodes(filter, focus);
		edges = buildEdges(focus, visibleEdges);
	});

	function toggleRelation(type: RelationType) {
		enabledRelations = {
			...enabledRelations,
			[type]: !enabledRelations[type]
		};
	}

	function clearFocusForFolder(folder: string) {
		if (readingFolder === folder) readingFolder = null;
		if (pinned?.kind === 'folder' && pinned.id === folder) pinned = null;
		if (hovered?.kind === 'folder' && hovered.id === folder) hovered = null;

		const reading = readingId ? fileById.get(readingId) : null;
		if (reading?.folder === folder) readingId = null;

		if (pinned?.kind === 'node') {
			const file = fileById.get(pinned.id);
			if (file?.folder === folder) pinned = null;
		}
		if (hovered?.kind === 'node') {
			const file = fileById.get(hovered.id);
			if (file?.folder === folder) hovered = null;
		}
	}

	function toggleFolderVisibility(folder: string) {
		const next = new Set(hiddenFolders);
		if (next.has(folder)) {
			next.delete(folder);
			hiddenFolders = next;
			return;
		}
		if (visibleFolderCount <= 1) return;
		next.add(folder);
		hiddenFolders = next;
		clearFocusForFolder(folder);
	}

	function isFolderVisible(folder: string) {
		return !hiddenFolders.has(folder);
	}

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
		readingFolder = null;
		const wasPinned = pinned?.kind === 'node' && pinned.id === node.id;
		pinTarget({ kind: 'node', id: node.id });
		if (wasPinned) {
			readingId = null;
		} else {
			readingId = node.id;
		}
	}

	function sameFocus(a: FocusTarget, b: FocusTarget) {
		if (a === b) return true;
		if (!a || !b) return false;
		return a.kind === b.kind && a.id === b.id;
	}

	function setHovered(next: FocusTarget) {
		if (sameFocus(hovered, next)) return;
		hovered = next;
	}

	function onnodepointerenter({ node }: { node: Node }) {
		setHovered({ kind: 'node', id: node.id });
	}

	function onnodepointerleave() {
		if (hovered?.kind === 'node') setHovered(null);
	}

	function onpaneclick() {
		pinned = null;
		setHovered(null);
	}

	function closeDialog() {
		readingId = null;
	}

	function closeFolderDialog() {
		readingFolder = null;
		if (pinned?.kind === 'folder') pinned = null;
	}

	function openFolderDialog(folder: string) {
		readingId = null;
		const wasOpen = readingFolder === folder;
		pinTarget({ kind: 'folder', id: folder });
		readingFolder = wasOpen ? null : folder;
		// Drop hover so pointer thrash during the camera move can't fight pin.
		setHovered(null);
		if (!wasOpen && viewMode === 'radial') {
			ringFocusTick += 1;
		}
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
			if (readingId || readingFolder) return;
			if (galleryOpen) {
				e.preventDefault();
				galleryOpen = false;
			}
			return;
		}

		if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
			if (isTypingTarget(e.target)) return;
			if (galleryOpen) return;
			if (readingId || readingFolder) return;
			if (viewMode !== 'radial') return;
			e.preventDefault();
			const direction = e.key === 'ArrowLeft' ? 'anticlockwise' : 'clockwise';
			navigateRing(direction);
			return;
		}

		if (e.key !== ' ' && e.code !== 'Space') return;
		if (isTypingTarget(e.target)) return;
		if (e.repeat) return;
		e.preventDefault();
		galleryOpen = !galleryOpen;
	}

	function onGallerySelect(id: string) {
		readingFolder = null;
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

	function ringFocusNodeId(): string | null {
		if (readingId) return readingId;
		if (pinned?.kind === 'node') return pinned.id;
		if (hovered?.kind === 'node') return hovered.id;
		return null;
	}

	function navigateRing(direction: 'clockwise' | 'anticlockwise') {
		if (ringNavOrder.length < 2) return;

		const anchorId = ringFocusNodeId() ?? ringNavOrder[0];
		if (!anchorId) return;

		const nextId = adjacentOnRing(ringNavOrder, anchorId, direction);
		if (!nextId) return;

		pinned = { kind: 'node', id: nextId };
		if (readingId) readingId = nextId;
		setHovered(null);
	}

	const folderNavOrder = $derived(
		viewMode === 'radial'
			? folderDescriptionOrder(ring.zones)
			: hierarchy.bands.map((b) => b.folder)
	);

	const folderDialogNavigation = $derived.by((): DialogNavigation | null => {
		if (!readingFolder || folderNavOrder.length < 2) return null;
		const index = folderNavOrder.indexOf(readingFolder);
		if (index === -1) return null;
		return {
			index,
			total: folderNavOrder.length,
			onPrev: () => navigateFolderRing('anticlockwise'),
			onNext: () => navigateFolderRing('clockwise')
		};
	});

	function navigateFolderRing(direction: 'clockwise' | 'anticlockwise') {
		if (!readingFolder || folderNavOrder.length < 2) return;
		const nextFolder = adjacentOnRing(folderNavOrder, readingFolder, direction);
		if (!nextFolder) return;
		readingFolder = nextFolder;
		pinned = { kind: 'folder', id: nextFolder };
	}

	function onZoneHover(folder: string | null) {
		setHovered(folder ? { kind: 'folder', id: folder } : null);
	}

	function onLegendEnter(folder: string) {
		setHovered({ kind: 'folder', id: folder });
	}

	function onLegendLeave() {
		if (hovered?.kind === 'folder') setHovered(null);
	}

	function onLegendClick(folder: string) {
		if (!isFolderVisible(folder)) return;
		openFolderDialog(folder);
	}

	function onLegendVisibilityClick(e: MouseEvent, folder: string) {
		e.stopPropagation();
		toggleFolderVisibility(folder);
	}

	function setView(mode: ViewMode) {
		if (viewMode === mode) return;
		viewMode = mode;
		pinned = null;
		setHovered(null);
		// Rebuild for the new layout before {#key viewMode} remounts SvelteFlow,
		// so fitView frames the whole graph instead of the previous layout.
		const focus = resolveFocus(null, visibleFiles, visibleEdges);
		nodes = buildNodes(filter, focus);
		edges = buildEdges(focus, visibleEdges);
	}
</script>

<div class="shell">
	<div class="chrome">
		<div class="brand">
			<strong>Two Swedens explorer</strong>
			<span class="count">
				{#if hiddenFolders.size > 0}
					{visibleFiles.length} of {data.files.length} files · {visibleEdges.length}
					links
				{:else}
					{data.files.length} files · {data.edges.length} links
				{/if}
				· eye to hide category · click ring or legend for category · click node to
				read · Space for cards
			</span>
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
		<div class="relations" role="group" aria-label="Relationship types">
			{#each RELATION_TYPES as type}
				<button
					type="button"
					class="relation-chip"
					class:active={enabledRelations[type]}
					onclick={() => toggleRelation(type)}
					title={type === 'mentions'
						? 'Untyped path mentions'
						: `Show ${type} links`}
				>
					<i style:background={RELATION_COLORS[type]}></i>
					{RELATION_LABELS[type]}
				</button>
			{/each}
		</div>
		<div class="legend" role="group" aria-label="Categories">
			{#each folders as folder}
				{@const visible = isFolderVisible(folder)}
				{@const lastVisible = visible && visibleFolderCount <= 1}
				<div
					class="legend-item"
					class:active={activeFolder === folder || pinnedFolder === folder}
					class:hidden={!visible}
					onpointerenter={() => onLegendEnter(folder)}
					onpointerleave={onLegendLeave}
				>
					<button
						type="button"
						class="legend-label"
						onclick={() => onLegendClick(folder)}
						disabled={!visible}
						title={visible
							? `Open ${folder} category`
							: `${folder} is hidden — use the eye to show`}
					>
						<i style:background={folderColor(folder)}></i>
						{folder}
					</button>
					<button
						type="button"
						class="legend-eye"
						class:off={!visible}
						aria-pressed={visible}
						aria-label={visible ? `Hide ${folder}` : `Show ${folder}`}
						title={lastVisible
							? 'Keep at least one category visible'
							: visible
								? `Hide ${folder}`
								: `Show ${folder}`}
						disabled={lastVisible}
						onclick={(e) => onLegendVisibilityClick(e, folder)}
					>
						{#if visible}
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								aria-hidden="true"
							>
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
								<circle cx="12" cy="12" r="3" />
							</svg>
						{:else}
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								aria-hidden="true"
							>
								<path
									d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
								/>
								<path
									d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
								/>
								<path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
								<line x1="1" y1="1" x2="23" y2="23" />
							</svg>
						{/if}
					</button>
				</div>
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
				elementsSelectable={false}
				nodesFocusable={false}
				edgesFocusable={false}
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
					<RingZones
						layout={ring}
						{activeFolder}
						onhover={onZoneHover}
						onclick={openFolderDialog}
					/>
				{:else}
					<HierarchyBands layout={hierarchy} />
				{/if}
				<FitOnMount
					worldPadding={viewMode === 'radial' ? 80 : 40}
					{ringFocusTick}
					ringCenter={viewMode === 'radial' ? ring.center : null}
					ringOuter={viewMode === 'radial' ? ring.ringOuter : null}
				/>
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

<FolderDialog
	folder={readingFolder}
	description={readingFolderDescription}
	navigation={folderDialogNavigation}
	onclose={closeFolderDialog}
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

	.relations {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		width: 100%;
		order: 5;
	}

	.relation-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.28rem;
		appearance: none;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 999px;
		background: transparent;
		color: rgba(232, 234, 237, 0.45);
		font-size: 0.68rem;
		padding: 0.2rem 0.5rem;
		cursor: pointer;
		opacity: 0.55;
		transition:
			opacity 120ms ease,
			background 120ms ease,
			color 120ms ease,
			border-color 120ms ease;
	}

	.relation-chip.active {
		opacity: 1;
		color: #e8eaed;
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.18);
	}

	.relation-chip:not(.active):hover {
		opacity: 0.85;
		color: rgba(232, 234, 237, 0.75);
	}

	.relation-chip i {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		display: inline-block;
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
		gap: 0.15rem;
		font-size: 0.7rem;
		color: rgba(232, 234, 237, 0.65);
		padding: 0.15rem 0.2rem 0.15rem 0.35rem;
		border-radius: 4px;
		border: none;
		background: transparent;
		transition:
			background 120ms ease,
			color 120ms ease,
			opacity 120ms ease;
	}

	.legend-item:hover,
	.legend-item.active {
		background: rgba(255, 255, 255, 0.06);
		color: #e8eaed;
	}

	.legend-item.hidden {
		opacity: 0.45;
		color: rgba(232, 234, 237, 0.4);
	}

	.legend-item.hidden:hover {
		opacity: 0.75;
	}

	.legend-label {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		appearance: none;
		border: none;
		background: transparent;
		color: inherit;
		font: inherit;
		padding: 0.05rem 0.15rem;
		cursor: pointer;
	}

	.legend-label:disabled {
		cursor: default;
		text-decoration: line-through;
	}

	.legend-label i {
		width: 8px;
		height: 8px;
		border-radius: 2px;
		display: inline-block;
		flex-shrink: 0;
	}

	.legend-eye {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		appearance: none;
		border: none;
		background: transparent;
		color: rgba(232, 234, 237, 0.55);
		padding: 0.15rem;
		border-radius: 3px;
		cursor: pointer;
		line-height: 0;
	}

	.legend-eye:hover:not(:disabled) {
		color: #e8eaed;
		background: rgba(255, 255, 255, 0.08);
	}

	.legend-eye.off {
		color: rgba(232, 234, 237, 0.35);
	}

	.legend-eye:disabled {
		opacity: 0.35;
		cursor: not-allowed;
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

	.canvas :global(.svelte-flow__node.selected),
	.canvas :global(.svelte-flow__node:focus),
	.canvas :global(.svelte-flow__node:focus-visible) {
		outline: none !important;
		box-shadow: none !important;
	}
</style>
