import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	// Fetch XMLTV sources
	const sourcesRes = await fetch('/api/livetv/epg/sources');
	const sourcesData = await sourcesRes.json();

	// Fetch scheduler status
	const schedulerRes = await fetch('/api/livetv/scheduler');
	const schedulerData = await schedulerRes.json();

	return {
		sources: sourcesData.sources ?? [],
		scheduler: schedulerData
	};
};
