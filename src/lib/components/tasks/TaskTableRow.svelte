<script lang="ts">
	import { invalidate } from '$app/navigation';
	import type { UnifiedTask } from '$lib/server/tasks/UnifiedTaskRegistry';
	import type { TaskHistoryEntry } from '$lib/types/task';
	import TaskIntervalCell from './TaskIntervalCell.svelte';

	interface Props {
		task: UnifiedTask;
		history: TaskHistoryEntry[];
		onRunTask: (taskId: string) => Promise<void>;
		onCancelTask?: (taskId: string) => Promise<void>;
		onShowHistory: () => void;
	}

	let { task, history, onRunTask, onCancelTask, onShowHistory }: Props = $props();

	let isRunning = $state(false);
	let isCancelling = $state(false);

	// Sync state with props
	$effect(() => {
		isRunning = task.isRunning;
		// Reset cancelling state when task stops running
		if (!task.isRunning) {
			isCancelling = false;
		}
	});

	// Derived state for last run status
	const lastRunStatus = $derived(() => {
		if (history.length === 0) return null;
		return history[0]?.status ?? null;
	});

	function formatTimeAgo(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 0) return formatTimeUntil(dateStr);
		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		return `${diffDays}d ago`;
	}

	function formatTimeUntil(dateStr: string | null): string {
		if (!dateStr) return '—';
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = date.getTime() - now.getTime();

		if (diffMs <= 0) return 'Overdue';

		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffMins < 60) return `in ${diffMins}m`;
		if (diffHours < 24) return `in ${diffHours}h`;
		return `in ${diffDays}d`;
	}

	async function runTask() {
		if (isRunning) return;
		isRunning = true;
		try {
			await onRunTask(task.id);
		} catch (error) {
			console.error('Task failed:', error);
		} finally {
			isRunning = false;
		}
	}

	async function cancelTask() {
		if (!isRunning || isCancelling || !onCancelTask) return;
		isCancelling = true;
		try {
			await onCancelTask(task.id);
		} catch (error) {
			console.error('Failed to cancel task:', error);
		}
	}

	async function toggleEnabled() {
		try {
			const response = await fetch(`/api/tasks/${task.id}/enabled`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ enabled: !task.enabled })
			});
			if (response.ok) {
				await invalidate('app:tasks');
			}
		} catch (error) {
			console.error('Failed to toggle task:', error);
		}
	}
</script>

<tr class="group hover:bg-base-200/50 {task.isRunning ? 'bg-primary/5' : ''}">
	<!-- Task Name -->
	<td>
		<div class="flex items-center gap-3">
			<div class="min-w-0 flex-1">
				<div class="truncate font-medium">{task.name}</div>
				<div class="truncate text-sm text-base-content/60">{task.description}</div>
			</div>
			{#if task.isRunning}
				<span class="badge gap-1 badge-sm badge-primary">
					<span class="loading loading-xs loading-spinner"></span>
					Running
				</span>
			{:else if lastRunStatus() === 'completed'}
				<span class="badge badge-sm badge-success"></span>
			{:else if lastRunStatus() === 'failed'}
				<span class="badge badge-sm badge-error"></span>
			{/if}
		</div>
	</td>

	{#if task.category === 'scheduled'}
		<!-- Interval -->
		<td>
			<TaskIntervalCell {task} />
		</td>

		<!-- Last Run -->
		<td class="text-sm">
			{formatTimeAgo(task.lastRunTime)}
		</td>

		<!-- Next Run -->
		<td class="text-sm">
			{#if task.nextRunTime}
				<span class={new Date(task.nextRunTime) <= new Date() ? 'text-warning' : ''}>
					{formatTimeUntil(task.nextRunTime)}
				</span>
			{:else}
				<span class="text-base-content/40">—</span>
			{/if}
		</td>
	{:else}
		<!-- Type -->
		<td class="text-sm text-base-content/60">Manual</td>

		<!-- Last Run -->
		<td class="text-sm">
			{formatTimeAgo(task.lastRunTime)}
		</td>
	{/if}

	<!-- Status (Enabled/Disabled) -->
	<td>
		<label class="swap swap-rotate">
			<input
				type="checkbox"
				class="toggle toggle-sm"
				checked={task.enabled}
				onchange={toggleEnabled}
				disabled={task.isRunning}
			/>
		</label>
	</td>

	<!-- Actions -->
	<td>
		<div class="flex items-center gap-1">
			{#if isRunning}
				<button
					class="btn btn-square text-error btn-ghost btn-xs"
					onclick={cancelTask}
					disabled={isCancelling}
					title="Cancel"
				>
					{#if isCancelling}
						<span class="loading loading-xs loading-spinner"></span>
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
						</svg>
					{/if}
				</button>
			{:else}
				<button
					class="btn btn-square btn-ghost btn-xs"
					onclick={runTask}
					disabled={!task.enabled}
					title="Run Now"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<polygon points="5 3 19 12 5 21 5 3" />
					</svg>
				</button>
			{/if}

			<button class="btn btn-square btn-ghost btn-xs" onclick={onShowHistory} title="View History">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polyline points="9 11 12 14 22 4" />
					<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
				</svg>
			</button>
		</div>
	</td>
</tr>
