/**
 * Type declarations for guessit-js
 *
 * @see https://www.npmjs.com/package/guessit-js
 */
declare module 'guessit-js' {
	export interface GuessitOutput {
		title?: string;
		year?: number;
		season?: number;
		episode?: number | number[];
		episode_title?: string;
		type?: 'movie' | 'episode';
		release_group?: string;
		source?: string;
		screen_size?: string;
		video_codec?: string;
		audio_codec?: string;
		streaming_service?: string;
		edition?: string;
		proper?: boolean;
		repack?: boolean;
		container?: string;
		mimetype?: string;
		language?: string | string[];
		subtitle_language?: string | string[];
		[key: string]: unknown;
	}

	export function guess(filename: string): Promise<GuessitOutput>;
	export function guessSync(filename: string): GuessitOutput;
}
