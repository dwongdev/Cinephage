/**
 * Quick Streaming Search Test
 *
 * Test if a specific movie/TV show is available via streaming providers.
 *
 * Usage:
 *   npx tsx scripts/test-streaming.ts <tmdbId> [type] [title] [year] [season] [episode]
 *
 * Examples:
 *   npx tsx scripts/test-streaming.ts 1196067 movie "Movie Title" 2024
 *   npx tsx scripts/test-streaming.ts 1396 tv "Breaking Bad" 2008 1 1
 *   npx tsx scripts/test-streaming.ts 27205   # Just TMDB ID (defaults to movie)
 */

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
	console.log(`
Quick Streaming Search Test

Usage:
  npx tsx scripts/test-streaming.ts <tmdbId> [type] [title] [year] [season] [episode]

Arguments:
  tmdbId   - TMDB ID of the movie/show (required)
  type     - 'movie' or 'tv' (default: movie)
  title    - Title for search matching (default: 'Unknown')
  year     - Release year (optional, recommended for movies)
  season   - Season number (required for TV)
  episode  - Episode number (required for TV)

Examples:
  npx tsx scripts/test-streaming.ts 1196067 movie "Some Movie" 2024
  npx tsx scripts/test-streaming.ts 1396 tv "Breaking Bad" 2008 1 1
  npx tsx scripts/test-streaming.ts 27205
`);
	process.exit(0);
}

const tmdbId = args[0];
const type = (args[1] as 'movie' | 'tv') || 'movie';
const title = args[2] || 'Unknown';
const year = args[3] ? parseInt(args[3]) : undefined;
const season = args[4] ? parseInt(args[4]) : undefined;
const episode = args[5] ? parseInt(args[5]) : undefined;

async function main() {
	console.log('\n' + '='.repeat(70));
	console.log('Streaming Search Test');
	console.log('='.repeat(70));
	console.log(`TMDB ID: ${tmdbId}`);
	console.log(`Type: ${type}`);
	console.log(`Title: ${title}`);
	if (year) console.log(`Year: ${year}`);
	if (type === 'tv') {
		console.log(`Season: ${season ?? 'not specified'}`);
		console.log(`Episode: ${episode ?? 'not specified'}`);
	}
	console.log('='.repeat(70) + '\n');

	const { extractStreams, getAvailableProviders, clearCaches } =
		await import('../src/lib/server/streaming/providers');
	type ExtractOptions = Parameters<typeof extractStreams>[0];

	clearCaches();

	const providers = getAvailableProviders();
	console.log(`Available providers: ${providers.map((p) => p.config.id).join(', ')}\n`);

	const options: ExtractOptions = {
		tmdbId,
		type,
		title,
		year,
		season,
		episode
	};

	console.log('Searching...\n');
	const startTime = Date.now();

	const result = await extractStreams(options);

	const duration = Date.now() - startTime;
	console.log(`\nCompleted in ${duration}ms`);
	console.log('='.repeat(70));

	if (!result.success) {
		console.log(`Result: FAILED`);
		console.log(`Error: ${result.error}`);
		console.log(`Streams found: 0`);
		process.exit(1);
	}

	console.log(`Result: SUCCESS`);
	console.log(`Streams found: ${result.sources.length}`);

	if (result.sources.length > 0) {
		console.log('\nStreams:');
		for (let i = 0; i < result.sources.length; i++) {
			const source = result.sources[i];
			console.log(
				`\n[${i + 1}] ${source.quality || 'Auto'} - ${source.server || source.title || 'Unknown'}`
			);
			console.log(`    URL: ${source.url.substring(0, 80)}${source.url.length > 80 ? '...' : ''}`);
			console.log(`    Referer: ${source.referer}`);
			if (source.language) console.log(`    Language: ${source.language}`);
			console.log(`    mpv: mpv "${source.url}" --referrer="${source.referer}"`);
		}
	}

	console.log('\n');
	process.exit(0);
}

main().catch((err) => {
	console.error('Error:', err);
	process.exit(1);
});
