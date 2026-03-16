---
slug: /
title: Cinephage Documentation
description: Complete documentation for Cinephage, the unified self-hosted media management platform
date: 2025-03-16
tags: [overview, getting-started]
---

# Cinephage Documentation

Welcome to the Cinephage documentation. Cinephage is a self-hosted media management platform that unifies movies, TV shows, live TV, and streaming into a single modern application.

## What Cinephage Does

Instead of running multiple separate services that do not talk to each other, Cinephage provides one cohesive platform:

- **One database** - All your movies, series, subtitles, and configurations live together
- **One interface** - Browse, search, monitor, and manage everything from a single UI
- **One configuration** - Set up indexers, download clients, and preferences once
- **One container** - Deploy with Docker and start managing immediately

## What It Replaces

Cinephage brings together functionality from multiple applications:

| Application  | Purpose              | Cinephage Equivalent                   |
| ------------ | -------------------- | -------------------------------------- |
| Radarr       | Movie management     | Built-in library with TMDB integration |
| Sonarr       | TV series management | Episode tracking and monitoring        |
| Prowlarr     | Indexer management   | YAML-based indexer definitions         |
| Bazarr       | Subtitle management  | 14 subtitle providers with auto-sync   |
| Overseerr    | Content discovery    | Smart lists and TMDB discovery         |
| FlareSolverr | Cloudflare bypass    | Built-in Camoufox solver               |

## Key Features

### Core Media Management

- **Library scanning** - Automatic file detection with TMDB matching
- **Quality scoring** - 50+ scoring factors for intelligent decisions
- **Custom formats** - User-defined rules for release selection
- **Multi-protocol indexers** - Unified torrent, usenet, and streaming support

### Advanced Streaming

- **.strm file generation** - Stream without downloading
- **NZB streaming** - Direct usenet streaming with on-the-fly extraction
- **Live TV** - Full IPTV management with EPG and channel lineups
- **Provider circuit breakers** - Automatic failover for streaming sources

### Subtitle Management

- **14 subtitle providers** - OpenSubtitles, Addic7ed, SubDL, and more
- **Language profiles** - Multi-language preferences with upgrade support
- **Auto-sync** - Built-in synchronization using the alass algorithm
- **Score-based selection** - Match by hash, filename, and metadata

### Smart Automation

- **Smart lists** - Dynamic TMDB queries with auto-add to library
- **7 monitoring tasks** - Missing content, upgrades, new episodes, and more
- **Worker system** - Background tasks with progress tracking
- **Notifications** - Jellyfin/Emby integration for library updates

## Quick Start

New to Cinephage? Start here:

1. **[Installation](getting-started/installation)** - Get Cinephage running with Docker
2. **[Initial Setup](getting-started/initial-setup)** - Configure TMDB API, download clients, and root folders
3. **[Adding Media](getting-started/adding-media)** - Add your first movie or TV show

## Documentation Structure

This documentation follows the Diátaxis framework with four distinct types of content:

### Tutorials

Step-by-step lessons for beginners. Hands-on learning with specific outcomes.

- [Installation](getting-started/installation)
- [Initial Setup](getting-started/initial-setup)
- [Adding Your First Movie](getting-started/adding-media)

### How-To Guides

Practical steps to solve specific problems. Task-oriented documentation.

- [Configure Download Clients](guides/configure/download-clients)
- [Set Up Quality Profiles](guides/configure/quality-profiles)
- [Configure Subtitles](guides/configure/subtitles)
- [Troubleshooting](guides/deploy/troubleshooting)

### Reference

Technical descriptions and comprehensive information.

- [Environment Variables](reference/configuration/environment-variables)
- [Database Schema](reference/database/schema-overview)
- [YAML Indexer Format](reference/yaml/indexer-definitions)

### Explanation

Background, concepts, and architecture decisions.

- [Architecture Overview](explanation/architecture)
- [Quality Scoring System](explanation/quality-scoring)
- [Workers and Tasks](explanation/workers-and-tasks)

## Getting Help

- **Discord** - [Join our community](https://discord.gg/scGCBTSWEt) for chat support
- **GitHub Issues** - [Report bugs](https://github.com/MoldyTaint/cinephage/issues) or request features
- **Troubleshooting** - See our [troubleshooting guide](guides/deploy/troubleshooting) for common issues

## Contributing

Cinephage is open source under the GPL-3.0 license. See our [GitHub repository](https://github.com/MoldyTaint/cinephage) to contribute code, report issues, or suggest improvements.

---

Ready to get started? Head to the [Installation guide](getting-started/installation).
