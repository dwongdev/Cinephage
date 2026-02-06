<script lang="ts">
	import { invalidate } from '$app/navigation';
	import type { PageData } from './$types';
	import TasksTable from '$lib/components/tasks/TasksTable.svelte';
	import CreateTaskPlaceholder from '$lib/components/tasks/CreateTaskPlaceholder.svelte';

	let { data }: { data: PageData } = $props();

	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);
	let showCreateModal = $state(false);

	// Check if any task is running for polling
	const hasRunningTask = $derived(data.tasks.some((t) => t.isRunning));

	// Poll for updates when tasks are running
	$effect(() => {
		if (hasRunningTask) {
			const interval = setInterval(() => {
				invalidate('app:tasks');
			}, 5000);
			return () => clearInterval(interval);
		}
	});

	/**
	 * Handle task execution
	 */
	async function handleRunTask(taskId: string): Promise<void> {
		const task = data.tasks.find((t) => t.id === taskId);
		if (!task) return;

		errorMessage = null;
		successMessage = null;

		try {
			const response = await fetch(`/api/tasks/${taskId}/run`, { method: 'POST' });
			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || result.message || 'Task failed');
			}

			// Format success message based on result
			if (result.result) {
				const { itemsProcessed, itemsGrabbed } = result.result;
				successMessage = `${task.name} completed: ${itemsProcessed ?? 0} processed, ${itemsGrabbed ?? 0} grabbed`;
			} else if (result.updatedFiles !== undefined) {
				successMessage = `${task.name} completed: ${result.updatedFiles}/${result.totalFiles ?? 0} files updated`;
			} else {
				successMessage = `${task.name} completed successfully`;
			}

			await invalidate('app:tasks');
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Task failed';
		}
	}

	/**
	 * Handle task cancellation
	 */
	async function handleCancelTask(taskId: string): Promise<void> {
		try {
			const response = await fetch(`/api/tasks/${taskId}/cancel`, { method: 'POST' });
			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || 'Failed to cancel task');
			}

			successMessage = 'Task cancelled successfully';
			await invalidate('app:tasks');
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Failed to cancel task';
		}
	}
</script>

<div class="w-full space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Tasks</h1>
			<p class="mt-1 text-base-content/60">
				Scheduled and maintenance tasks for your Cinephage instance
			</p>
		</div>
		<button class="btn gap-2 btn-sm btn-primary" onclick={() => (showCreateModal = true)}>
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
				<line x1="12" y1="5" x2="12" y2="19" />
				<line x1="5" y1="12" x2="19" y2="12" />
			</svg>
			Create Task
		</button>
	</div>

	<!-- Alerts -->
	{#if errorMessage}
		<div class="alert-sm alert alert-error">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="12" cy="12" r="10" />
				<line x1="15" y1="9" x2="9" y2="15" />
				<line x1="9" y1="9" x2="15" y2="15" />
			</svg>
			<span>{errorMessage}</span>
			<button class="btn ml-auto btn-ghost btn-xs" onclick={() => (errorMessage = null)}
				>Dismiss</button
			>
		</div>
	{/if}

	{#if successMessage}
		<div class="alert-sm alert alert-success">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
				<polyline points="22 4 12 14.01 9 11.01" />
			</svg>
			<span>{successMessage}</span>
			<button class="btn ml-auto btn-ghost btn-xs" onclick={() => (successMessage = null)}
				>Dismiss</button
			>
		</div>
	{/if}

	<!-- Tasks Table -->
	<TasksTable
		tasks={data.tasks}
		taskHistory={data.taskHistory}
		onRunTask={handleRunTask}
		onCancelTask={handleCancelTask}
	/>

	<!-- Create Task Modal -->
	<CreateTaskPlaceholder isOpen={showCreateModal} onClose={() => (showCreateModal = false)} />
</div>
