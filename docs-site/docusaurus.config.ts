import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
	title: 'Cinephage',
	tagline: 'One app to replace them all — self-hosted media management',
	favicon: 'img/logo.png',

	future: {
		v4: true
	},

	url: 'https://docs.cinephage.net',
	baseUrl: '/',

	organizationName: 'MoldyTaint',
	projectName: 'Cinephage',

	onBrokenLinks: 'throw',

	markdown: {
		hooks: {
			onBrokenMarkdownLinks: 'warn'
		}
	},

	i18n: {
		defaultLocale: 'en',
		locales: ['en']
	},

	presets: [
		[
			'classic',
			{
				docs: {
					sidebarPath: './sidebars.ts',
					editUrl: 'https://github.com/MoldyTaint/Cinephage/edit/main/docs-site/'
				},
				blog: false,
				theme: {
					customCss: './src/css/custom.css'
				}
			} satisfies Preset.Options
		]
	],

	themeConfig: {
		image: 'img/logo.png',
		colorMode: {
			defaultMode: 'dark',
			respectPrefersColorScheme: true
		},
		navbar: {
			title: 'Cinephage',
			logo: {
				alt: 'Cinephage Logo',
				src: 'img/logo.png'
			},
			items: [
				{
					type: 'docSidebar',
					sidebarId: 'docsSidebar',
					position: 'left',
					label: 'Documentation'
				},
				{
					href: 'https://github.com/MoldyTaint/Cinephage',
					label: 'GitHub',
					position: 'right'
				}
			]
		},
		footer: {
			style: 'dark',
			links: [
				{
					title: 'Documentation',
					items: [
						{
							label: 'Getting Started',
							to: '/docs/getting-started'
						},
						{
							label: 'Guides',
							to: '/docs/guides'
						},
						{
							label: 'Reference',
							to: '/docs/reference'
						}
					]
				},
				{
					title: 'Community',
					items: [
						{
							label: 'GitHub Discussions',
							href: 'https://github.com/MoldyTaint/Cinephage/discussions'
						},
						{
							label: 'Issues',
							href: 'https://github.com/MoldyTaint/Cinephage/issues'
						}
					]
				},
				{
					title: 'More',
					items: [
						{
							label: 'GitHub',
							href: 'https://github.com/MoldyTaint/Cinephage'
						},
						{
							label: 'Changelog',
							href: 'https://github.com/MoldyTaint/Cinephage/blob/main/CHANGELOG.md'
						}
					]
				}
			],
			copyright: `Copyright \u00A9 ${new Date().getFullYear()} Cinephage. Licensed under GPL-3.0. Built with Docusaurus.`
		},
		prism: {
			theme: prismThemes.github,
			darkTheme: prismThemes.dracula,
			additionalLanguages: ['bash', 'docker', 'json', 'yaml', 'toml', 'nginx']
		}
	} satisfies Preset.ThemeConfig
};

export default config;
