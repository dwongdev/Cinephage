---
title: Database Schema Overview
description: Overview of Cinephage's SQLite database structure and tables
sidebar_position: 1
date: 2025-03-16
tags: [database, schema, sqlite, reference]
---

# Database Schema Overview

This reference provides an overview of Cinephage's database structure, including major tables and their relationships.

## Database Information

- **Engine:** SQLite 3
- **Location:** `/config/cinephage.db`
- **Format:** Single-file database
- **Backup:** Simple file copy when Cinephage is stopped

## Schema Version

Cinephage uses schema versioning for migrations:

- Current schema version is stored in database metadata
- Automatic migrations run on startup when needed
- Backward compatibility maintained within major versions

## Major Table Categories

### Authentication (Better Auth)

User authentication and session management:

| Table            | Purpose                        |
| ---------------- | ------------------------------ |
| `user`           | User accounts and profile data |
| `session`        | Active authentication sessions |
| `account`        | OAuth/SSO account links        |
| `verification`   | Email verification tokens      |
| `authApiKeys`    | API key storage                |
| `authRateLimits` | Rate limiting data             |

### Library

Core media library data:

| Table                | Purpose                              |
| -------------------- | ------------------------------------ |
| `movies`             | Movie metadata and monitoring status |
| `movieFiles`         | Physical movie files                 |
| `series`             | TV series metadata                   |
| `seasons`            | Season information                   |
| `episodes`           | Episode metadata                     |
| `episodeFiles`       | Physical episode files               |
| `rootFolders`        | Configured root folders              |
| `unmatchedFiles`     | Files awaiting manual matching       |
| `libraryScanHistory` | Scan operation history               |

### Downloads

Download client integration:

| Table             | Purpose                        |
| ----------------- | ------------------------------ |
| `downloadQueue`   | Active downloads               |
| `downloadHistory` | Completed downloads            |
| `downloadClients` | Download client configurations |
| `blocklist`       | Failed/problematic releases    |
| `pendingReleases` | Releases awaiting download     |

### Indexers

Content source management:

| Table                | Purpose                        |
| -------------------- | ------------------------------ |
| `indexerDefinitions` | YAML indexer definitions cache |
| `indexers`           | Configured indexer instances   |
| `indexerStatus`      | Health status tracking         |

### Quality

Scoring and quality management:

| Table               | Purpose                      |
| ------------------- | ---------------------------- |
| `scoringProfiles`   | Quality profile definitions  |
| `profileSizeLimits` | Size constraints per profile |
| `customFormats`     | Custom format rules          |
| `delayProfiles`     | Download delay settings      |

### Monitoring

Automated task management:

| Table                | Purpose                  |
| -------------------- | ------------------------ |
| `monitoringSettings` | Task configuration       |
| `monitoringHistory`  | Task execution history   |
| `taskSettings`       | Background task settings |
| `taskHistory`        | Task run history         |

### Subtitles

Subtitle management:

| Table               | Purpose                      |
| ------------------- | ---------------------------- |
| `languageProfiles`  | Language preference profiles |
| `subtitleProviders` | Provider configurations      |
| `subtitles`         | Downloaded subtitle records  |
| `subtitleHistory`   | Download history             |
| `subtitleBlacklist` | Rejected subtitle entries    |
| `subtitleSettings`  | Global subtitle settings     |

### Smart Lists

Dynamic content lists:

| Table                     | Purpose             |
| ------------------------- | ------------------- |
| `smartLists`              | List definitions    |
| `smartListItems`          | Items in each list  |
| `smartListRefreshHistory` | List update history |

### Streaming

Streaming and NZB streaming:

| Table                   | Purpose                       |
| ----------------------- | ----------------------------- |
| `streamExtractionCache` | Stream processing cache       |
| `nntpServers`           | Usenet server configurations  |
| `nzbStreamMounts`       | NZB streaming mounts          |
| `nzbSegmentCache`       | Segment caching for streaming |

### Live TV

IPTV and live television:

| Table                  | Purpose                           |
| ---------------------- | --------------------------------- |
| `stalkerPortals`       | Stalker portal configurations     |
| `portalScanResults`    | MAC address scan results          |
| `portalScanHistory`    | Scan operation history            |
| `livetvAccounts`       | Live TV account configs (unified) |
| `livetvChannels`       | Channel information               |
| `livetvCategories`     | Channel categories                |
| `channelCategories`    | User category assignments         |
| `channelLineupItems`   | User channel lineups              |
| `channelLineupBackups` | Backup source configurations      |
| `epgPrograms`          | Electronic program guide data     |

### System

Application settings and metadata:

| Table                   | Purpose                   |
| ----------------------- | ------------------------- |
| `settings`              | Application settings      |
| `librarySettings`       | Library-specific settings |
| `namingSettings`        | File naming configuration |
| `namingPresets`         | Built-in naming presets   |
| `captchaSolverSettings` | Captcha solver config     |
| `mediaBrowserServers`   | Jellyfin/Emby connections |
| `externalIdCache`       | TMDB external ID cache    |
| `alternateTitles`       | Title aliases             |
| `userApiKeySecrets`     | API key secrets           |

## Key Relationships

### Movie Relationships

```
movies
├── movieFiles (one-to-many)
├── subtitles (many-to-many)
└── rootFolders (many-to-one)
```

### TV Series Relationships

```
series
├── seasons (one-to-many)
│   └── episodes (one-to-many)
│       ├── episodeFiles (one-to-many)
│       └── subtitles (many-to-many)
└── rootFolders (many-to-one)
```

### Download Flow

```
movies/episodes
└── downloadQueue (one-to-one while downloading)
    ├── downloadClients (many-to-one)
    └── downloadHistory (becomes history entry)
```

## Common Queries

### List All Movies

```sql
SELECT id, title, year, monitored, tmdbId
FROM movies
ORDER BY title;
```

### Count Monitored Items

```sql
SELECT
  (SELECT COUNT(*) FROM movies WHERE monitored = 1) as monitored_movies,
  (SELECT COUNT(*) FROM series WHERE monitored = 1) as monitored_series;
```

### Recent Downloads

```sql
SELECT
  dh.id,
  dh.title,
  dh.quality,
  dh.date
FROM downloadHistory dh
ORDER BY dh.date DESC
LIMIT 10;
```

### Files Missing Quality Info

```sql
SELECT
  m.title,
  m.year
FROM movies m
LEFT JOIN movieFiles mf ON m.id = mf.movieId
WHERE m.monitored = 1
  AND (mf.id IS NULL OR mf.quality IS NULL);
```

## Database Size Estimates

Typical database sizes:

| Library Size   | Database Size | Notes          |
| -------------- | ------------- | -------------- |
| 100 movies     | 1-2 MB        | Minimal        |
| 1,000 movies   | 5-10 MB       | Small library  |
| 10,000 movies  | 20-50 MB      | Medium library |
| 50,000+ movies | 100-200 MB    | Large library  |

Size factors:

- Number of movies/series/episodes
- Download history retention
- Subtitle records
- Cache tables

## Backup and Maintenance

### Creating Backups

```bash
# While Cinephage is stopped
cp /path/to/config/cinephage.db /path/to/backups/cinephage-$(date +%Y%m%d).db

# Or use SQLite online backup (while running)
sqlite3 /path/to/config/cinephage.db ".backup /path/to/backups/cinephage-$(date +%Y%m%d).db"
```

### Database Optimization

```bash
# Vacuum (reclaim space, optimize)
sqlite3 /path/to/config/cinephage.db "VACUUM;"

# Analyze (update statistics)
sqlite3 /path/to/config/cinephage.db "ANALYZE;"
```

Run optimization monthly or after large imports.

### Integrity Check

```bash
# Check for corruption
sqlite3 /path/to/config/cinephage.db "PRAGMA integrity_check;"

# Should return "ok"
```

## Accessing the Database

### Docker Access

```bash
# Enter container shell
docker exec -it cinephage sh

# Access database
sqlite3 /config/cinephage.db

# Or run query directly
docker exec cinephage sqlite3 /config/cinephage.db "SELECT COUNT(*) FROM movies;"
```

### Local Access (if not using Docker)

```bash
# Direct access
sqlite3 /path/to/config/cinephage.db
```

## Schema Migrations

Cinephage handles schema migrations automatically:

1. Current version stored in database
2. On startup, check if migrations needed
3. Apply pending migrations in order
4. Update version number

**Important:**

- Back up before major version upgrades
- Do not manually modify schema
- Report migration errors as bugs

## See Also

- [Backup and Restore](../../guides/deploy/backup-restore)
- [Troubleshooting](../../guides/deploy/troubleshooting)
- [Performance Tuning](../../guides/deploy/performance-tuning)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
