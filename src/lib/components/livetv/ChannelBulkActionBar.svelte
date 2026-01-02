<script lang="ts">
	import { X, Plus, Loader2 } from 'lucide-svelte';

	interface Props {
		selectedCount: number;
		loading: boolean;
		onAdd: () => void;
		onClear: () => void;
	}

	let { selectedCount, loading, onAdd, onClear }: Props = $props();
</script>

{#if selectedCount > 0}
	<div class="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
		<div
			class="flex items-center gap-4 rounded-full border border-base-content/10 bg-base-300 px-6 py-3 shadow-xl"
		>
			<span class="text-sm font-medium">
				{selectedCount} channel{selectedCount !== 1 ? 's' : ''} selected
			</span>

			<div class="flex items-center gap-2">
				<button class="btn gap-2 btn-sm btn-primary" onclick={onAdd} disabled={loading}>
					{#if loading}
						<Loader2 size={16} class="animate-spin" />
						Adding...
					{:else}
						<Plus size={16} />
						Add to Lineup
					{/if}
				</button>

				<button class="btn btn-circle btn-ghost btn-sm" onclick={onClear} title="Clear selection">
					<X size={16} />
				</button>
			</div>
		</div>
	</div>
{/if}
