---
title: Indexer Definitions
description: YAML format reference for defining custom indexers in Cinephage
sidebar_position: 1
date: 2025-03-16
tags: [yaml, indexers, torrent, usenet, streaming, reference]
---

# YAML Indexer Definitions

This reference documents the YAML format for defining custom indexers in Cinephage.

## Overview

Cinephage uses YAML files to define all indexer configurations. This provides flexibility and makes it easy to add custom indexers without code changes.

## YAML Structure

### Basic Template

```yaml
id: unique-id # Unique identifier (required)
name: Display Name # Human-readable name (required)
protocol: torrent # torrent, usenet, or streaming (required)
categories: # Supported content types (required)
  - movies
  - tv
enabled: true # Enable/disable (default: true)
priority: 25 # Search priority 1-50 (default: 25)
description: Optional description
settings: # Protocol-specific settings
  # See protocol sections below
```

### Required Fields

| Field        | Type   | Description                                            |
| ------------ | ------ | ------------------------------------------------------ |
| `id`         | string | Unique identifier (alphanumeric, hyphens, underscores) |
| `name`       | string | Display name shown in UI                               |
| `protocol`   | string | `torrent`, `usenet`, or `streaming`                    |
| `categories` | array  | Content types: `movies`, `tv`                          |
| `settings`   | object | Protocol-specific configuration                        |

### Optional Fields

| Field         | Type    | Default | Description                               |
| ------------- | ------- | ------- | ----------------------------------------- |
| `enabled`     | boolean | `true`  | Whether indexer is active                 |
| `priority`    | integer | `25`    | Search priority (lower = higher priority) |
| `description` | string  | -       | Optional description                      |

## Torrent Indexers

### Basic Torrent Definition

```yaml
id: example-torrent
name: Example Torrent Site
protocol: torrent
categories:
  - movies
  - tv
enabled: true
priority: 20
settings:
  baseUrl: https://example.com
  search:
    path: /search?q={{query}}
    method: GET
  selectors:
    rows: table.results tr
    title: td.title a
    magnet: td.magnet a
    torrent: td.download a
    size: td.size
    seeders: td.seeders
    leechers: td.leechers
    date: td.date
```

### Search Configuration

```yaml
settings:
  baseUrl: https://example.com
  search:
    path: /search?q={{query}}&page={{page}}&category={{category}}
    method: GET
    headers:
      User-Agent: Mozilla/5.0
      Accept: text/html
    cookies:
      session: abc123
```

**Search Variables:**

| Variable       | Description  | Example          |
| -------------- | ------------ | ---------------- |
| `{{query}}`    | Search term  | "Inception 2010" |
| `{{page}}`     | Page number  | 1, 2, 3          |
| `{{category}}` | Category ID  | movies, tv       |
| `{{year}}`     | Release year | 2010             |

### CSS Selectors

Define how to extract data from HTML:

```yaml
selectors:
  rows: string # CSS selector for result rows
  title: string # Title element within row
  magnet: string # Magnet link element
  torrent: string # Torrent file link element
  size: string # File size element
  seeders: string # Seeders count element
  leechers: string # Leechers count element
  date: string # Upload date element
  category: string # Category element
```

**Selector Examples:**

```yaml
selectors:
  rows: tr.result-row
  title: td.name a
  magnet: a[href^="magnet:"]
  torrent: a[href$=".torrent"]
  size: td.size text() # Extract text content
  seeders: td.peers span.seeders
```

### Attribute Extraction

Extract specific attributes:

```yaml
selectors:
  magnet:
    selector: a.magnet-link
    attribute: href # Extract href attribute

  title:
    selector: a.title
    attribute: title # Extract title attribute

  size:
    selector: td.size
    regex: '(\d+\.?\d*)\s*(GB|MB|KB)' # Extract with regex
```

### Authentication

For sites requiring login:

```yaml
settings:
  baseUrl: https://example.com
  auth:
    type: cookie
    cookies:
      uid: your-user-id
      pass: your-pass-key

  # Or using headers
  search:
    headers:
      Authorization: Bearer YOUR_API_KEY
      X-API-Key: YOUR_KEY
```

### Advanced: Login Flow

For sites requiring form login:

```yaml
settings:
  baseUrl: https://example.com
  auth:
    type: form
    loginUrl: /login
    usernameField: username
    passwordField: password
    submitButton: input[type="submit"]
    successCheck: .user-profile # Element that exists after login
```

## Usenet Indexers (Newznab)

### Standard Newznab

```yaml
id: nzbgeek
name: NZBGeek
protocol: usenet
categories:
  - movies
  - tv
settings:
  apiUrl: https://api.nzbgeek.info/
  apiKey: your-api-key
  categories:
    movies: 2000
    tv: 5000
  timeout: 30
  retries: 3
```

### Newznab Settings

```yaml
settings:
  apiUrl: string # API endpoint URL
  apiKey: string # Your API key
  username: string # Username (if required)
  password: string # Password (if required)

  categories: # Category mappings
    movies: integer # Movies category ID
    tv: integer # TV category ID

  timeout: integer # Request timeout seconds (default: 30)
  retries: integer # Retry attempts (default: 3)
  rateLimit: integer # Requests per minute (optional)
```

### Common Newznab Categories

| ID   | Category       |
| ---- | -------------- |
| 2000 | Movies         |
| 2010 | Movies/Foreign |
| 2040 | Movies/HD      |
| 2050 | Movies/BluRay  |
| 2060 | Movies/3D      |
| 5000 | TV             |
| 5040 | TV/HD          |
| 5050 | TV/Foreign     |
| 5080 | TV/Documentary |

## Streaming Indexers

### Basic Streaming Definition

```yaml
id: example-streaming
name: Example Streaming
protocol: streaming
categories:
  - movies
  - tv
settings:
  baseUrl: https://api.example.com
  apiKey: your-api-key
  timeout: 30
  endpoints:
    search: /v1/search
    resolve: /v1/resolve
```

### Streaming Settings

```yaml
settings:
  baseUrl: string # Base API URL
  apiKey: string # API key
  apiSecret: string # API secret (if required)

  timeout: integer # Request timeout seconds (default: 30)

  endpoints: # API endpoints
    search: string # Search endpoint
    resolve: string # Stream resolution endpoint

  headers: # Custom headers
    X-Custom-Header: value
```

## Torznab Indexers (via Jackett/Prowlarr)

```yaml
id: jackett-1337x
name: 1337x via Jackett
protocol: torrent
categories:
  - movies
  - tv
settings:
  apiUrl: http://jackett:9117/api/v2.0/indexers/1337x/results/torznab/
  apiKey: your-jackett-api-key
  categories:
    movies: 2000
    tv: 5000
```

## Complete Examples

### Example 1: Public Torrent Tracker

```yaml
id: 1337x
name: 1337x
protocol: torrent
categories:
  - movies
  - tv
priority: 25
settings:
  baseUrl: https://1337x.to
  search:
    path: /search/{{query}}/1/
    method: GET
  selectors:
    rows: table.table-list tbody tr
    title: td.name a:nth-child(2)
    magnet: td.coll-1 a[href^="magnet:"]
    size: td.size
    seeders: td.seeds
    leechers: td.leeches
    date: td.date
```

### Example 2: Private Tracker with Login

```yaml
id: private-tracker
name: Private Tracker
protocol: torrent
categories:
  - movies
  - tv
priority: 10
settings:
  baseUrl: https://tracker.example.com
  auth:
    type: cookie
    cookies:
      uid: 12345
      pass: abcdef1234567890
  search:
    path: /torrents.php?search={{query}}&category={{category}}
  selectors:
    rows: table.torrents tr.torrent
    title: td.name a
    torrent: td.download a
    size: td.size
    seeders: td.seeders
    leechers: td.leechers
```

### Example 3: Usenet Indexer

```yaml
id: nzbgeek
name: NZBGeek
protocol: usenet
categories:
  - movies
  - tv
priority: 5
settings:
  apiUrl: https://api.nzbgeek.info/
  apiKey: YOUR_API_KEY_HERE
  categories:
    movies: 2000
    tv: 5000
  timeout: 30
  retries: 3
```

### Example 4: Streaming Provider

```yaml
id: my-streaming
name: My Streaming Service
protocol: streaming
categories:
  - movies
  - tv
priority: 5
settings:
  baseUrl: https://api.streaming.example.com
  apiKey: YOUR_API_KEY
  timeout: 30
  endpoints:
    search: /v1/search
    resolve: /v1/resolve
```

## Testing Indexers

### Validate YAML Syntax

Before adding to Cinephage, validate YAML:

```bash
# Using Python
python3 -c "import yaml; yaml.safe_load(open('indexer.yaml'))"

# Or online validators
# https://yaml-online-parser.appspot.com/
```

### Test Selectors

Use browser DevTools to test CSS selectors:

1. Open the site in browser
2. Press F12 for DevTools
3. In Console tab, test:
   ```javascript
   document.querySelectorAll('table.results tr');
   ```

### Add to Cinephage

1. Go to **Settings > Integrations > Indexers**
2. Click **Add Indexer**
3. Select **YAML Definition**
4. Paste your YAML
5. Click **Validate**
6. Click **Test**
7. Click **Save**

## Troubleshooting

### YAML Parse Errors

**Problem:** "Invalid YAML" error

**Solutions:**

- Check indentation (spaces, not tabs)
- Validate YAML syntax online
- Check for special characters in strings
- Use quotes around strings with colons

### Selector Not Found

**Problem:** No results from working site

**Solutions:**

- Test selectors in browser DevTools
- Check if site uses JavaScript rendering
- Verify selector matches actual HTML
- Try more specific selectors

### Authentication Fails

**Problem:** 401 or login errors

**Solutions:**

- Verify credentials/cookies
- Check if site requires 2FA
- Try different auth type
- Check if IP is whitelisted

### Empty Results

**Problem:** Test succeeds but no search results

**Solutions:**

- Check if search term works on site directly
- Verify category parameters
- Check if site requires specific search format
- Try different query variables

## Best Practices

### Naming Conventions

- Use descriptive IDs: `nyaa` not `indexer1`
- Keep names concise but clear
- Use consistent casing

### Priority Guidelines

| Priority | Use Case                       |
| -------- | ------------------------------ |
| 1-10     | Primary, high-quality indexers |
| 11-20    | Good indexers, regular use     |
| 21-30    | Backup indexers                |
| 31-50    | Fallback, public trackers      |

### Categories

Only enable categories the indexer supports:

- Movies: Movie releases
- TV: TV series releases
- Both: General indexers

### Security

- Never commit API keys to version control
- Use environment variables for sensitive data
- Rotate API keys periodically
- Use read-only keys when available

## See Also

- [Configure Indexers](../../guides/configure/indexers)
- [Search and Download](../../guides/use/search-and-download)
- [YAML Specification](https://yaml.org/spec/)
- [CSS Selector Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors)
