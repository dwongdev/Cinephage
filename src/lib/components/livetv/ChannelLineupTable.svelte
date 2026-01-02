<script lang="ts">
	import { GripVertical, Tv, Trash2, Radio, Pencil } from 'lucide-svelte';
	import type { ChannelLineupItemWithAccount } from '$lib/types/livetv';

	interface Props {
		items: ChannelLineupItemWithAccount[];
		selectedIds: Set<string>;
		reorderMode: boolean;
		onToggleSelect: (id: string) => void;
		onSelectAll: () => void;
		onClearSelection: () => void;
		onReorder: (itemIds: string[]) => void;
		onRemove: (itemIds: string[]) => void;
		onToggleReorderMode: () => void;
		onEdit: (item: ChannelLineupItemWithAccount) => void;
	}

	let {
		items,
		selectedIds,
		reorderMode,
		onToggleSelect,
		onSelectAll,
		onClearSelection,
		onReorder,
		onRemove,
		onToggleReorderMode,
		onEdit
	}: Props = $props();

	// Drag and drop state
	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	// Get unique accounts for color badges
	const accountColors = $derived(() => {
		const colors = [
			'bg-primary text-primary-content',
			'bg-secondary text-secondary-content',
			'bg-accent text-accent-content',
			'bg-info text-info-content',
			'bg-warning text-warning-content'
		];
		const accounts = [...new Set(items.map((i) => i.accountId))];
		return new Map(accounts.map((id, idx) => [id, colors[idx % colors.length]]));
	});

	function handleDragStart(event: DragEvent, index: number) {
		if (!reorderMode) return;
		draggedIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', String(index));
		}
	}

	function handleDragOver(event: DragEvent, index: number) {
		if (!reorderMode || draggedIndex === null) return;
		event.preventDefault();
		dragOverIndex = index;
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	function handleDrop(event: DragEvent, dropIndex: number) {
		if (!reorderMode || draggedIndex === null) return;
		event.preventDefault();

		if (draggedIndex !== dropIndex) {
			const newOrder = [...items];
			const [removed] = newOrder.splice(draggedIndex, 1);
			newOrder.splice(dropIndex, 0, removed);
			onReorder(newOrder.map((i) => i.id));
		}

		draggedIndex = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}

	const allSelected = $derived(items.length > 0 && selectedIds.size === items.length);
	const someSelected = $derived(selectedIds.size > 0 && selectedIds.size < items.length);
</script>

{#if items.length === 0}
	<div class="py-12 text-center text-base-content/60">
		<Radio class="mx-auto mb-4 h-12 w-12 opacity-40" />
		<p class="text-lg font-medium">Your lineup is empty</p>
		<p class="mt-1 text-sm">Browse channels and add them to your custom lineup</p>
	</div>
{:else}
	<div class="overflow-x-auto">
		<div class="flex items-center justify-between border-b border-base-300 px-4 py-2">
			<div class="flex items-center gap-2">
				{#if !reorderMode}
					<input
						type="checkbox"
						class="checkbox checkbox-sm"
						checked={allSelected}
						indeterminate={someSelected}
						onchange={() => (allSelected ? onClearSelection() : onSelectAll())}
					/>
					<span class="text-sm text-base-content/70">
						{selectedIds.size > 0 ? `${selectedIds.size} selected` : `${items.length} channels`}
					</span>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				{#if selectedIds.size > 0 && !reorderMode}
					<button class="btn btn-sm btn-error" onclick={() => onRemove(Array.from(selectedIds))}>
						<Trash2 class="h-4 w-4" />
						Remove ({selectedIds.size})
					</button>
				{/if}
				<button
					class="btn btn-sm {reorderMode ? 'btn-primary' : 'btn-ghost'}"
					onclick={onToggleReorderMode}
				>
					<GripVertical class="h-4 w-4" />
					{reorderMode ? 'Done' : 'Reorder'}
				</button>
			</div>
		</div>

		{#if reorderMode}
			<div class="flex items-center gap-2 bg-info/10 px-4 py-2 text-sm text-info">
				<GripVertical class="h-4 w-4" />
				Drag channels to reorder your lineup.
			</div>
		{/if}

		<table class="table">
			<thead>
				<tr>
					{#if reorderMode}
						<th class="w-10"></th>
					{:else}
						<th class="w-10"></th>
					{/if}
					<th class="w-16">#</th>
					<th>Channel</th>
					<th>Category</th>
					<th>Account</th>
					<th class="w-10"></th>
				</tr>
			</thead>
			<tbody>
				{#each items as item, index (item.id)}
					<tr
						class="group hover transition-colors {draggedIndex === index
							? 'opacity-50'
							: ''} {dragOverIndex === index ? 'bg-primary/10' : ''}"
						draggable={reorderMode}
						ondragstart={(e) => handleDragStart(e, index)}
						ondragover={(e) => handleDragOver(e, index)}
						ondragleave={handleDragLeave}
						ondrop={(e) => handleDrop(e, index)}
						ondragend={handleDragEnd}
					>
						{#if reorderMode}
							<td class="cursor-grab">
								<GripVertical class="h-4 w-4 text-base-content/50" />
							</td>
						{:else}
							<td>
								<input
									type="checkbox"
									class="checkbox checkbox-sm"
									checked={selectedIds.has(item.id)}
									onchange={() => onToggleSelect(item.id)}
								/>
							</td>
						{/if}
						<td>
							<div class="flex flex-col">
								<span class="font-mono text-sm opacity-70">{item.position}</span>
								{#if item.channelNumber}
									<span class="font-mono text-xs text-primary">Ch {item.channelNumber}</span>
								{/if}
							</div>
						</td>
						<td>
							<div class="flex items-center gap-3">
								{#if item.displayLogo}
									<div class="avatar">
										<div class="h-10 w-10 rounded bg-base-100">
											<img
												src={item.displayLogo}
												alt={item.displayName}
												class="object-contain"
												loading="lazy"
												onerror={(e) => {
													const target = e.target as HTMLImageElement;
													target.style.display = 'none';
												}}
											/>
										</div>
									</div>
								{:else}
									<div class="placeholder avatar">
										<div class="flex h-10 w-10 items-center justify-center rounded bg-base-300">
											<Tv class="h-5 w-5 opacity-40" />
										</div>
									</div>
								{/if}
								<div class="min-w-0 flex-1">
									<div class="truncate font-medium">
										{item.displayName}
										{#if item.customName}
											<span class="ml-1 text-xs text-primary">(custom)</span>
										{/if}
									</div>
									{#if item.epgId}
										<div class="truncate font-mono text-xs opacity-50">{item.epgId}</div>
									{/if}
								</div>
							</div>
						</td>
						<td>
							{#if item.category}
								<span
									class="badge badge-sm text-white"
									style="background-color: {item.category.color || '#6b7280'};"
								>
									{item.category.name}
								</span>
							{:else if item.cachedCategoryName}
								<span class="badge badge-ghost badge-sm opacity-50">{item.cachedCategoryName}</span>
							{:else}
								<span class="text-base-content/40">-</span>
							{/if}
						</td>
						<td>
							<span class="badge badge-sm {accountColors().get(item.accountId)}">
								{item.accountName}
							</span>
						</td>
						<td>
							<button
								class="btn btn-circle opacity-0 btn-ghost transition-opacity btn-sm group-hover:opacity-100"
								onclick={() => onEdit(item)}
								title="Edit channel"
							>
								<Pencil class="h-4 w-4" />
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
