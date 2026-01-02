import type { PageLoad } from './$types';
import type { StalkerAccount } from '$lib/types/livetv';

export const load: PageLoad = async ({ fetch }) => {
	const response = await fetch('/api/livetv/accounts');
	const accounts: StalkerAccount[] = await response.json();

	return { accounts };
};
