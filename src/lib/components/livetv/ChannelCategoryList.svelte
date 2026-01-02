<script lang="ts">
	import { GripVertical, Pencil, Trash2, Plus, Folder } from 'lucide-svelte';
	import type { ChannelCategory } from '$lib/types/livetv';

	interface CategoryWithCount extends ChannelCategory {
		channelCount: number;
	}

	interface Props {
		categories: CategoryWithCount[];
		selectedCategoryId: string | null;
		onSelect: (id: string | null) => void;
		onAdd: () => void;
		onEdit: (category: ChannelCategory) => void;
		onDelete: (category: ChannelCategory) => void;
		onReorder: (categoryIds: string[]) => void;
	}

	let { categories, selectedCategoryId, onSelect, onAdd, onEdit, onDelete, onReorder }: Props =
		$props();

	// Drag state
	let draggedIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	function handleDragStart(e: DragEvent, index: number) {
		draggedIndex = index;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(index));
		}
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (draggedIndex !== null && draggedIndex !== index) {
			dragOverIndex = index;
		}
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	function handleDrop(e: DragEvent, dropIndex: number) {
		e.preventDefault();
		if (draggedIndex !== null && draggedIndex !== dropIndex) {
			// Create new order array
			const newCategories = [...categories];
			const [moved] = newCategories.splice(draggedIndex, 1);
			newCategories.splice(dropIndex, 0, moved);
			onReorder(newCategories.map((c) => c.id));
		}
		draggedIndex = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		draggedIndex = null;
		dragOverIndex = null;
	}

	// Total channels count for "All" option
	const totalChannels = $derived(categories.reduce((sum, c) => sum + c.channelCount, 0));
</script>

<div class="rounded-box bg-base-200 p-2">
	<!-- Header -->
	<div class="mb-2 flex items-center justify-between px-2">
		<span class="text-sm font-medium">Categories</span>
		<button class="btn btn-circle btn-ghost btn-xs" onclick={onAdd} title="Add category">
			<Plus class="h-4 w-4" />
		</button>
	</div>

	<!-- All Channels option -->
	<button
		class="rounded-btn flex w-full items-center gap-2 px-3 py-2 text-left transition-colors {selectedCategoryId ===
		null
			? 'bg-primary text-primary-content'
			: 'hover:bg-base-300'}"
		onclick={() => onSelect(null)}
	>
		<Folder class="h-4 w-4 opacity-70" />
		<span class="flex-1 truncate text-sm">All Channels</span>
		<span class="badge badge-sm {selectedCategoryId === null ? 'badge-primary-content' : ''}">
			{totalChannels}
		</span>
	</button>

	<!-- Category list -->
	{#if categories.length > 0}
		<div class="mt-1 space-y-0.5">
			{#each categories as category, index (category.id)}
				<div
					class="group rounded-btn flex items-center gap-1 transition-all {dragOverIndex === index
						? 'border-t-2 border-primary'
						: ''} {selectedCategoryId === category.id
						? 'bg-primary text-primary-content'
						: 'hover:bg-base-300'}"
					draggable="true"
					ondragstart={(e) => handleDragStart(e, index)}
					ondragover={(e) => handleDragOver(e, index)}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, index)}
					ondragend={handleDragEnd}
				>
					<!-- Drag handle -->
					<button
						class="cursor-grab px-1 opacity-0 group-hover:opacity-50 active:cursor-grabbing"
						title="Drag to reorder"
					>
						<GripVertical class="h-4 w-4" />
					</button>

					<!-- Category button -->
					<button
						class="flex flex-1 items-center gap-2 py-2 text-left"
						onclick={() => onSelect(category.id)}
					>
						<!-- Color indicator -->
						<span
							class="h-3 w-3 rounded-full"
							style="background-color: {category.color || '#6b7280'};"
						></span>
						<span class="flex-1 truncate text-sm">{category.name}</span>
						<span
							class="badge badge-sm {selectedCategoryId === category.id
								? 'badge-primary-content'
								: ''}"
						>
							{category.channelCount}
						</span>
					</button>

					<!-- Edit/Delete buttons -->
					<div class="flex opacity-0 group-hover:opacity-100">
						<button
							class="btn btn-circle btn-ghost btn-xs"
							onclick={() => onEdit(category)}
							title="Edit category"
						>
							<Pencil class="h-3 w-3" />
						</button>
						<button
							class="btn btn-circle text-error btn-ghost btn-xs"
							onclick={() => onDelete(category)}
							title="Delete category"
						>
							<Trash2 class="h-3 w-3" />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="py-4 text-center text-sm opacity-60">No categories yet</div>
	{/if}
</div>
