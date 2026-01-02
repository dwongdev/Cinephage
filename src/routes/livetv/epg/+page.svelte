<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import {
		Plus,
		RefreshCw,
		Trash2,
		Settings,
		CheckCircle2,
		XCircle,
		AlertCircle,
		Loader2,
		Calendar,
		Tv
	} from 'lucide-svelte';
	import type { PageData } from './$types';
	import { ConfirmationModal } from '$lib/components/ui/modal';

	let { data }: { data: PageData } = $props();

	interface EpgSource {
		id: string;
		name: string;
		url: string;
		enabled: boolean;
		priority: number;
		lastFetchedAt: string | null;
		fetchIntervalHours: number;
		channelCount: number;
		status: 'ok' | 'error' | 'pending';
		errorMessage: string | null;
		createdAt: string;
		updatedAt: string;
	}

	// Modal state
	let addModalOpen = $state(false);
	let editModalOpen = $state(false);
	let editingSource = $state<EpgSource | null>(null);

	// Form state
	let formName = $state('');
	let formUrl = $state('');
	let formEnabled = $state(true);
	let formPriority = $state(1);
	let formFetchInterval = $state(6);
	let saving = $state(false);
	let saveError = $state<string | null>(null);

	// Delete confirmation
	let confirmDeleteOpen = $state(false);
	let deleteTarget = $state<EpgSource | null>(null);

	// Refresh state
	let refreshingId = $state<string | null>(null);
	let refreshingAll = $state(false);

	function openAddModal() {
		formName = '';
		formUrl = '';
		formEnabled = true;
		formPriority = 1;
		formFetchInterval = 6;
		saveError = null;
		addModalOpen = true;
	}

	function openEditModal(source: EpgSource) {
		editingSource = source;
		formName = source.name;
		formUrl = source.url;
		formEnabled = source.enabled;
		formPriority = source.priority;
		formFetchInterval = source.fetchIntervalHours;
		saveError = null;
		editModalOpen = true;
	}

	function closeModals() {
		addModalOpen = false;
		editModalOpen = false;
		editingSource = null;
		saveError = null;
	}

	async function handleSave() {
		saving = true;
		saveError = null;

		try {
			const body = {
				name: formName,
				url: formUrl,
				enabled: formEnabled,
				priority: formPriority,
				fetchIntervalHours: formFetchInterval
			};

			let response: Response;
			if (editingSource) {
				response = await fetch(`/api/livetv/epg/sources/${editingSource.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
			} else {
				response = await fetch('/api/livetv/epg/sources', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
			}

			const result = await response.json();
			if (!response.ok || !result.success) {
				saveError = result.error || 'Failed to save source';
				return;
			}

			closeModals();
			await invalidateAll();
		} catch (e) {
			saveError = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			saving = false;
		}
	}

	async function handleRefresh(source: EpgSource) {
		refreshingId = source.id;
		try {
			await fetch(`/api/livetv/epg/sources/${source.id}/refresh`, {
				method: 'POST'
			});
			await invalidateAll();
		} finally {
			refreshingId = null;
		}
	}

	async function handleRefreshAll() {
		refreshingAll = true;
		try {
			await fetch('/api/livetv/scheduler/run', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ task: 'xmltvRefresh' })
			});
			await invalidateAll();
		} finally {
			refreshingAll = false;
		}
	}

	async function handleDelete() {
		if (!deleteTarget) return;

		try {
			await fetch(`/api/livetv/epg/sources/${deleteTarget.id}`, {
				method: 'DELETE'
			});
			await invalidateAll();
		} finally {
			confirmDeleteOpen = false;
			deleteTarget = null;
		}
	}

	function formatLastFetch(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		const date = new Date(dateStr);
		if (isNaN(date.getTime())) return dateStr;

		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / (1000 * 60));
		const hours = Math.floor(diff / (1000 * 60 * 60));
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days}d ago`;

		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}

	function getStatusBadge(status: string) {
		switch (status) {
			case 'ok':
				return { class: 'badge-success', icon: CheckCircle2, text: 'OK' };
			case 'error':
				return { class: 'badge-error', icon: XCircle, text: 'Error' };
			default:
				return { class: 'badge-ghost', icon: AlertCircle, text: 'Pending' };
		}
	}
</script>

<svelte:head>
	<title>EPG Sources - Cinephage</title>
</svelte:head>

<div class="w-full p-4">
	<div class="mb-6">
		<h1 class="text-2xl font-bold">EPG Sources</h1>
		<p class="text-base-content/70">
			Manage external XMLTV sources for electronic program guide data.
		</p>
	</div>

	<!-- Scheduler Status Card -->
	<div class="card mb-6 bg-base-100 shadow-xl">
		<div class="card-body">
			<h2 class="card-title text-lg">
				<Calendar class="h-5 w-5" />
				Scheduler Status
			</h2>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
				{#if data.scheduler?.tasks?.providerEpg}
					<div>
						<div class="text-sm opacity-70">Provider EPG</div>
						<div class="font-medium">
							{formatLastFetch(data.scheduler.tasks.providerEpg.lastRunTime)}
						</div>
						<div class="text-xs opacity-50">
							Every {data.scheduler.tasks.providerEpg.intervalHours}h
						</div>
					</div>
				{/if}
				{#if data.scheduler?.tasks?.xmltvRefresh}
					<div>
						<div class="text-sm opacity-70">XMLTV Refresh</div>
						<div class="font-medium">
							{formatLastFetch(data.scheduler.tasks.xmltvRefresh.lastRunTime)}
						</div>
						<div class="text-xs opacity-50">
							Every {data.scheduler.tasks.xmltvRefresh.intervalHours}h
						</div>
					</div>
				{/if}
				{#if data.scheduler?.tasks?.epgCleanup}
					<div>
						<div class="text-sm opacity-70">EPG Cleanup</div>
						<div class="font-medium">
							{formatLastFetch(data.scheduler.tasks.epgCleanup.lastRunTime)}
						</div>
						<div class="text-xs opacity-50">
							Every {data.scheduler.tasks.epgCleanup.intervalHours}h
						</div>
					</div>
				{/if}
				{#if data.scheduler?.tasks?.channelSync}
					<div>
						<div class="text-sm opacity-70">Channel Sync</div>
						<div class="font-medium">
							{formatLastFetch(data.scheduler.tasks.channelSync.lastRunTime)}
						</div>
						<div class="text-xs opacity-50">
							Every {data.scheduler.tasks.channelSync.intervalHours}h
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Actions -->
	<div class="mb-4 flex items-center justify-between">
		<button class="btn gap-2" onclick={handleRefreshAll} disabled={refreshingAll}>
			{#if refreshingAll}
				<Loader2 class="h-4 w-4 animate-spin" />
			{:else}
				<RefreshCw class="h-4 w-4" />
			{/if}
			Refresh All
		</button>
		<button class="btn gap-2 btn-primary" onclick={openAddModal}>
			<Plus class="h-4 w-4" />
			Add Source
		</button>
	</div>

	<!-- Sources Table -->
	<div class="card bg-base-100 shadow-xl">
		<div class="card-body p-0">
			{#if data.sources.length === 0}
				<div class="py-12 text-center text-base-content/60">
					<Tv class="mx-auto mb-4 h-12 w-12 opacity-40" />
					<p class="text-lg font-medium">No XMLTV sources configured</p>
					<p class="mt-1 text-sm">Add an XMLTV source to import EPG data</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="table">
						<thead>
							<tr>
								<th>Name</th>
								<th>URL</th>
								<th>Channels</th>
								<th>Last Fetched</th>
								<th>Status</th>
								<th class="text-right">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each data.sources as source (source.id)}
								{@const status = getStatusBadge(source.status)}
								<tr class="hover">
									<td>
										<div class="font-bold">{source.name}</div>
										<div class="text-xs opacity-50">Priority: {source.priority}</div>
									</td>
									<td>
										<div class="max-w-xs truncate font-mono text-sm" title={source.url}>
											{source.url}
										</div>
									</td>
									<td>
										<span class="badge badge-ghost badge-sm">
											{source.channelCount} channels
										</span>
									</td>
									<td>
										<span class="text-sm opacity-70">
											{formatLastFetch(source.lastFetchedAt)}
										</span>
									</td>
									<td>
										<span
											class="badge gap-1 badge-sm {status.class}"
											title={source.errorMessage || ''}
										>
											<svelte:component this={status.icon} class="h-3 w-3" />
											{status.text}
										</span>
									</td>
									<td>
										<div class="flex justify-end gap-1">
											<button
												class="btn btn-ghost btn-sm"
												onclick={() => handleRefresh(source)}
												title="Refresh now"
												disabled={refreshingId === source.id}
											>
												{#if refreshingId === source.id}
													<Loader2 class="h-4 w-4 animate-spin" />
												{:else}
													<RefreshCw class="h-4 w-4" />
												{/if}
											</button>
											<button
												class="btn btn-ghost btn-sm"
												onclick={() => openEditModal(source)}
												title="Edit"
											>
												<Settings class="h-4 w-4" />
											</button>
											<button
												class="btn text-error btn-ghost btn-sm"
												onclick={() => {
													deleteTarget = source;
													confirmDeleteOpen = true;
												}}
												title="Delete"
											>
												<Trash2 class="h-4 w-4" />
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Add Modal -->
<dialog class="modal" class:modal-open={addModalOpen}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">Add XMLTV Source</h3>
		<div class="py-4">
			<div class="form-control mb-3">
				<label class="label" for="add-name">
					<span class="label-text">Name</span>
				</label>
				<input
					type="text"
					id="add-name"
					class="input-bordered input"
					bind:value={formName}
					placeholder="My EPG Source"
				/>
			</div>
			<div class="form-control mb-3">
				<label class="label" for="add-url">
					<span class="label-text">XMLTV URL</span>
				</label>
				<input
					type="url"
					id="add-url"
					class="input-bordered input"
					bind:value={formUrl}
					placeholder="https://example.com/epg.xml"
				/>
			</div>
			<div class="form-control mb-3">
				<label class="label" for="add-interval">
					<span class="label-text">Refresh Interval (hours)</span>
				</label>
				<input
					type="number"
					id="add-interval"
					class="input-bordered input"
					bind:value={formFetchInterval}
					min="1"
					max="168"
				/>
			</div>
			{#if saveError}
				<div class="mb-3 alert alert-error">
					<XCircle class="h-4 w-4" />
					<span>{saveError}</span>
				</div>
			{/if}
		</div>
		<div class="modal-action">
			<button class="btn" onclick={closeModals}>Cancel</button>
			<button
				class="btn btn-primary"
				onclick={handleSave}
				disabled={saving || !formName || !formUrl}
			>
				{#if saving}
					<Loader2 class="h-4 w-4 animate-spin" />
				{/if}
				Add Source
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={closeModals}>close</button>
	</form>
</dialog>

<!-- Edit Modal -->
<dialog class="modal" class:modal-open={editModalOpen}>
	<div class="modal-box">
		<h3 class="text-lg font-bold">Edit XMLTV Source</h3>
		<div class="py-4">
			<div class="form-control mb-3">
				<label class="label" for="edit-name">
					<span class="label-text">Name</span>
				</label>
				<input type="text" id="edit-name" class="input-bordered input" bind:value={formName} />
			</div>
			<div class="form-control mb-3">
				<label class="label" for="edit-url">
					<span class="label-text">XMLTV URL</span>
				</label>
				<input type="url" id="edit-url" class="input-bordered input" bind:value={formUrl} />
			</div>
			<div class="form-control mb-3">
				<label class="label" for="edit-interval">
					<span class="label-text">Refresh Interval (hours)</span>
				</label>
				<input
					type="number"
					id="edit-interval"
					class="input-bordered input"
					bind:value={formFetchInterval}
					min="1"
					max="168"
				/>
			</div>
			<div class="form-control mb-3">
				<label class="label cursor-pointer">
					<span class="label-text">Enabled</span>
					<input type="checkbox" class="toggle toggle-primary" bind:checked={formEnabled} />
				</label>
			</div>
			{#if saveError}
				<div class="mb-3 alert alert-error">
					<XCircle class="h-4 w-4" />
					<span>{saveError}</span>
				</div>
			{/if}
		</div>
		<div class="modal-action">
			<button class="btn" onclick={closeModals}>Cancel</button>
			<button
				class="btn btn-primary"
				onclick={handleSave}
				disabled={saving || !formName || !formUrl}
			>
				{#if saving}
					<Loader2 class="h-4 w-4 animate-spin" />
				{/if}
				Save Changes
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button onclick={closeModals}>close</button>
	</form>
</dialog>

<!-- Delete Confirmation -->
<ConfirmationModal
	open={confirmDeleteOpen}
	title="Delete Source"
	message={`Are you sure you want to delete "${deleteTarget?.name}"? This will also remove all EPG data from this source.`}
	confirmLabel="Delete"
	confirmVariant="error"
	onConfirm={handleDelete}
	onCancel={() => {
		confirmDeleteOpen = false;
		deleteTarget = null;
	}}
/>
