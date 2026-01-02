import type { PageLoad } from './$types';
import type { StalkerCategoryWithAccount } from '$lib/types/livetv';

export const load: PageLoad = async ({ fetch }) => {
	const response = await fetch('/api/livetv/categories');
	const categories: StalkerCategoryWithAccount[] = await response.json();

	return { categories };
};
