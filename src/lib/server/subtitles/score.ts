/**
 * Subtitle Scoring System - Based on Bazarr/Subliminal architecture
 *
 * Configurable score weights for movie vs episode matching,
 * hash validation logic, and score computation.
 */

import type { Subtitle, MatchType } from './subtitle';
import type { Video } from './video';
import { isEpisode, isMovie } from './video';

/**
 * Score configuration for different match types
 */
export interface ScoreConfig {
	hash: number;
	title: number;
	series: number;
	year: number;
	season: number;
	episode: number;
	release_group: number;
	source: number;
	resolution: number;
	video_codec: number;
	audio_codec: number;
	streaming_service: number;
	imdb_id: number;
	tmdb_id: number;
	tvdb_id: number;
	// Penalties/bonuses
	hearing_impaired: number;
	forced: number;
}

/**
 * Default scores for episode matching
 *
 * Based on Bazarr's subliminal_patch/score.py
 */
export const EPISODE_SCORES: ScoreConfig = {
	hash: 359,
	series: 180,
	year: 90,
	season: 30,
	episode: 30,
	release_group: 14,
	source: 7,
	resolution: 2,
	video_codec: 2,
	audio_codec: 3,
	streaming_service: 1,
	title: 0, // Episodes don't use title
	imdb_id: 90, // Equivalent to series + year
	tmdb_id: 90,
	tvdb_id: 90,
	hearing_impaired: 1,
	forced: 0
};

/**
 * Default scores for movie matching
 */
export const MOVIE_SCORES: ScoreConfig = {
	hash: 119,
	title: 60,
	year: 30,
	release_group: 13,
	source: 7,
	resolution: 2,
	video_codec: 2,
	audio_codec: 3,
	streaming_service: 1,
	series: 0, // Movies don't use series
	season: 0,
	episode: 0,
	imdb_id: 60, // Equivalent to title + year
	tmdb_id: 60,
	tvdb_id: 0, // Movies don't use TVDB
	hearing_impaired: 1,
	forced: 0
};

/**
 * Minimum matches required to validate a hash match for episodes
 *
 * If a subtitle claims hash match but doesn't have these matches,
 * the hash is invalidated. This prevents wrong subtitles from
 * incorrectly matching via hash.
 */
export const EPISODE_HASH_VALID_IF: Set<MatchType> = new Set(['series', 'season', 'episode']);

/**
 * Minimum matches required to validate a hash match for movies
 */
export const MOVIE_HASH_VALID_IF: Set<MatchType> = new Set(['title']);

/**
 * Compute score for a subtitle against a video
 *
 * @param subtitle The subtitle to score
 * @param video The video to match against
 * @param config Optional custom score configuration
 * @returns Computed score
 */
export function computeScore(
	subtitle: Subtitle,
	video: Video,
	config?: Partial<ScoreConfig>
): number {
	const scores = isEpisode(video)
		? { ...EPISODE_SCORES, ...config }
		: { ...MOVIE_SCORES, ...config };

	// Get matches from subtitle
	let matches = subtitle.getMatches(video);

	// Validate hash if present
	matches = validateHash(matches, video, subtitle);

	// Apply equivalent matches (e.g., imdb_id implies title + year for movies)
	matches = applyEquivalentMatches(matches, video);

	// Compute total score
	let score = 0;
	for (const match of matches) {
		score += scores[match] ?? 0;
	}

	// Apply HI bonus/penalty
	if (subtitle.isHearingImpaired) {
		score += scores.hearing_impaired;
	}

	// Apply forced bonus
	if (subtitle.isForced) {
		score += scores.forced;
	}

	return score;
}

/**
 * Validate hash match
 *
 * Based on Bazarr's hash validation logic:
 * - If hash is verifiable and matches, check minimum required matches
 * - If minimum matches are present, keep only hash (highest score)
 * - If minimum matches are missing, invalidate hash
 *
 * @param matches Current match set
 * @param video Video being matched
 * @param subtitle Subtitle being scored
 * @returns Validated match set
 */
export function validateHash(
	matches: Set<MatchType>,
	video: Video,
	subtitle: Subtitle
): Set<MatchType> {
	if (!matches.has('hash')) {
		return matches;
	}

	// Only validate if provider says hash is verifiable
	if (!subtitle.hashVerifiable) {
		return matches;
	}

	const requiredMatches = isEpisode(video) ? EPISODE_HASH_VALID_IF : MOVIE_HASH_VALID_IF;

	// Check if all required matches are present
	const hasRequiredMatches = [...requiredMatches].every((m) => matches.has(m));

	if (hasRequiredMatches) {
		// Hash is valid - return only hash for maximum score
		// This is Bazarr's behavior: a verified hash match trumps everything
		return new Set(['hash']);
	} else {
		// Hash is invalid - remove it
		const newMatches = new Set(matches);
		newMatches.delete('hash');
		return newMatches;
	}
}

/**
 * Apply equivalent matches
 *
 * Certain matches imply others:
 * - imdb_id for movies implies title + year
 * - imdb_id for episodes implies series + year
 * - tmdb_id behaves the same as imdb_id
 * - tvdb_id for episodes implies series
 *
 * @param matches Current match set
 * @param video Video being matched
 * @returns Match set with equivalents applied
 */
export function applyEquivalentMatches(matches: Set<MatchType>, video: Video): Set<MatchType> {
	const result = new Set(matches);

	if (isMovie(video)) {
		// IMDB/TMDB ID implies title + year for movies
		if (matches.has('imdb_id') || matches.has('tmdb_id')) {
			result.add('title');
			result.add('year');
		}
	} else if (isEpisode(video)) {
		// IMDB/TMDB ID implies series + year for episodes
		if (matches.has('imdb_id') || matches.has('tmdb_id')) {
			result.add('series');
			result.add('year');
		}
		// TVDB ID implies series
		if (matches.has('tvdb_id')) {
			result.add('series');
		}
	}

	return result;
}

/**
 * Get maximum possible score for a video type
 */
export function getMaxScore(video: Video): number {
	const scores = isEpisode(video) ? EPISODE_SCORES : MOVIE_SCORES;

	// Hash is the maximum since validated hash replaces all other matches
	return scores.hash;
}

/**
 * Get minimum acceptable score for a video type
 *
 * Below this score, subtitle quality is too low
 */
export function getMinScore(video: Video): number {
	const scores = isEpisode(video) ? EPISODE_SCORES : MOVIE_SCORES;

	if (isEpisode(video)) {
		// Minimum: series + season + episode
		return scores.series + scores.season + scores.episode;
	} else {
		// Minimum: title
		return scores.title;
	}
}

/**
 * Compute score breakdown for debugging
 */
export function computeScoreBreakdown(
	subtitle: Subtitle,
	video: Video,
	config?: Partial<ScoreConfig>
): ScoreBreakdown {
	const scores = isEpisode(video)
		? { ...EPISODE_SCORES, ...config }
		: { ...MOVIE_SCORES, ...config };

	let matches = subtitle.getMatches(video);
	const originalMatches = new Set(matches);

	matches = validateHash(matches, video, subtitle);
	const hashValidated = !originalMatches.has('hash') || matches.has('hash');

	matches = applyEquivalentMatches(matches, video);

	const breakdown: Record<string, number> = {};
	let total = 0;

	for (const match of matches) {
		const score = scores[match] ?? 0;
		breakdown[match] = score;
		total += score;
	}

	if (subtitle.isHearingImpaired) {
		breakdown['hearing_impaired'] = scores.hearing_impaired;
		total += scores.hearing_impaired;
	}

	if (subtitle.isForced) {
		breakdown['forced'] = scores.forced;
		total += scores.forced;
	}

	return {
		matches: [...matches],
		breakdown,
		total,
		hashValidated,
		maxPossible: getMaxScore(video)
	};
}

/**
 * Score breakdown result
 */
export interface ScoreBreakdown {
	matches: MatchType[];
	breakdown: Record<string, number>;
	total: number;
	hashValidated: boolean;
	maxPossible: number;
}

/**
 * Sort subtitles by score (highest first)
 */
export function sortByScore(subtitles: Subtitle[], video: Video): Subtitle[] {
	return [...subtitles].sort((a, b) => {
		const scoreA = computeScore(a, video);
		const scoreB = computeScore(b, video);
		return scoreB - scoreA;
	});
}

/**
 * Filter subtitles below minimum score
 */
export function filterByMinScore(
	subtitles: Subtitle[],
	video: Video,
	minScore?: number
): Subtitle[] {
	const threshold = minScore ?? getMinScore(video);
	return subtitles.filter((s) => computeScore(s, video) >= threshold);
}
