import type { ReactNode } from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
	title: string;
	description: ReactNode;
};

const FeatureList: FeatureItem[] = [
	{
		title: 'All-in-One',
		description: (
			<>
				Replace Radarr, Sonarr, Prowlarr, Bazarr, Overseerr, and FlareSolverr with a single
				self-hosted application. One database, one config, one container.
			</>
		)
	},
	{
		title: 'Smart Quality Management',
		description: (
			<>
				50+ quality scoring factors with intelligent upgrade logic. Custom formats, delay profiles,
				and quality profiles give you full control over your media library.
			</>
		)
	},
	{
		title: 'Stream-First Design',
		description: (
			<>
				Native .strm file support, usenet streaming, and built-in Live TV / IPTV. Access your media
				instantly without waiting for full downloads.
			</>
		)
	}
];

function Feature({ title, description }: FeatureItem) {
	return (
		<div className={clsx('col col--4')}>
			<div className="text--center padding-horiz--md padding-vert--lg">
				<Heading as="h3">{title}</Heading>
				<p>{description}</p>
			</div>
		</div>
	);
}

export default function HomepageFeatures(): ReactNode {
	return (
		<section className={styles.features}>
			<div className="container">
				<div className="row">
					{FeatureList.map((props, idx) => (
						<Feature key={idx} {...props} />
					))}
				</div>
			</div>
		</section>
	);
}
