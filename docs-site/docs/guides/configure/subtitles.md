---
title: Configure Subtitles
description: Set up subtitle providers, language profiles, and automatic downloads
sidebar_position: 4
date: 2025-03-16
tags: [subtitles, languages, providers, configuration, guide]
---

# Configure Subtitles

This guide walks you through configuring Cinephage's subtitle management system with 14 supported providers and automatic downloading.

## Goal

Enable automatic subtitle downloads for your media library in multiple languages.

## Prerequisites

- Cinephage installed and running
- Media files in your library
- (Optional) Accounts with subtitle providers

## Time Estimate

10-15 minutes

## Understanding Subtitle Management

Cinephage provides comprehensive subtitle support:

- **14 subtitle providers** - Multiple sources for best coverage
- **Language profiles** - Multi-language preferences
- **Auto-download** - Automatic search on import
- **Subtitle sync** - Built-in synchronization
- **Score-based selection** - Best match by hash and filename

### Supported Subtitle Providers

| Provider          | Type         | Notes                       |
| ----------------- | ------------ | --------------------------- |
| OpenSubtitles.com | Free/Premium | Largest database            |
| OpenSubtitles.org | Free         | Legacy API                  |
| Podnapisi         | Free         | Good for European languages |
| Subscene          | Free         | Wide language support       |
| Addic7ed          | Free         | TV-focused                  |
| SubDL             | Free         | Fast API                    |
| YIFYSubtitles     | Free         | Movie-focused               |
| Gestdown          | Free         | TV subtitles                |
| Subf2m            | Free         | Multi-language              |
| NapiProjekt       | Free         | Polish-focused              |
| LegendasDivx      | Free         | Portuguese-focused          |
| BetaSeries        | Free         | TV series                   |
| Assrt             | Free         | Asian languages             |

## Part 1: Enable Subtitle Providers

### Step 1: Access Subtitle Settings

1. Go to **Settings > Integrations > Subtitle Providers**
2. See list of available providers
3. Toggle providers to enable them

### Step 2: Configure OpenSubtitles

OpenSubtitles is recommended as a primary provider:

**Free Account:**

1. Create free account at [opensubtitles.com](https://www.opensubtitles.com)
2. In Cinephage, click **Configure** on OpenSubtitles
3. Enter your username and password
4. Click **Save**

**VIP/Premium Account (Optional):**

- VIP accounts have higher download limits
- Enter VIP credentials for priority access

### Step 3: Enable Additional Providers

Enable providers based on your language needs:

**For English:**

- OpenSubtitles.com
- Subscene
- SubDL

**For European Languages:**

- Podnapisi (Slavic languages)
- Addic7ed (TV shows)

**For Asian Languages:**

- Assrt (Chinese, Japanese, Korean)

**For TV Shows:**

- Addic7ed
- Gestdown
- BetaSeries

**For Movies:**

- YIFYSubtitles
- Subscene

Enable at least 3-5 providers for good coverage.

### Step 4: Set Provider Priority

Providers are searched in priority order (1 = highest):

1. Click **Edit** on a provider
2. Set **Priority** (1-10 recommended for primary, 11-20 for backup)
3. Click **Save**

**Recommended Priority Order:**

1. OpenSubtitles.com (Priority 1)
2. Subscene (Priority 2)
3. Addic7ed (Priority 3)
4. SubDL (Priority 4)
5. Others (Priority 5-10)

## Part 2: Create Language Profiles

Language profiles define which languages you want subtitles for.

### Step 1: Access Language Profiles

1. Go to **Settings > Integrations > Language Profiles**
2. See default profiles or create new ones

### Step 2: Create a New Profile

1. Click **Add Language Profile**
2. Enter **Profile Name**: `English Primary` (or your preference)
3. Configure languages:

**Add Languages:**

1. Click **Add Language**
2. Select language from dropdown
3. Set options:
   - **Required**: Must have this subtitle
   - **Cutoff**: Stop searching once found
   - **Upgrade**: Continue searching for better matches

**Example Profile - English Primary:**

```
1. English
   - Required: Yes
   - Cutoff: Yes
   - Upgrade: No

2. Spanish
   - Required: No
   - Cutoff: No
   - Upgrade: Yes
```

### Step 3: Create Multi-Language Profile

For multiple required languages:

**Example - English and Spanish:**

```
1. English
   - Required: Yes
   - Cutoff: Yes

2. Spanish
   - Required: Yes
   - Cutoff: Yes

3. French
   - Required: No
   - Cutoff: Yes
   - Upgrade: Yes (optional extra)
```

### Step 4: Set Default Profile

1. Go to **Settings > General**
2. Under **Subtitle Settings**
3. Select **Default Language Profile**
4. Click **Save**

## Part 3: Configure Download Behavior

### Automatic Download on Import

Enable subtitles to download automatically when media is imported:

1. Go to **Settings > Tasks**
2. Find **Subtitle Search on Import** task
3. Enable it
4. Set interval (default: immediate)
5. Click **Save**

### Scheduled Subtitle Search

Search for missing subtitles periodically:

1. In **Settings > Tasks**
2. Find **Missing Subtitle Search** task
3. Enable it
4. Set interval (recommended: daily or weekly)
5. Click **Save**

### Subtitle Upgrades

Enable upgrading to better subtitle matches:

1. In **Settings > Tasks**
2. Find **Subtitle Upgrade Search** task
3. Enable it
4. Set interval (recommended: weekly)
5. Click **Save**

## Part 4: Apply Language Profile to Media

### Apply to Movies

1. Go to **Library > Movies**
2. Select movies (or all)
3. Click **Edit**
4. Under **Language Profile**, select your profile
5. Click **Save**

### Apply to TV Series

1. Go to **Library > TV**
2. Select series (or all)
3. Click **Edit**
4. Under **Language Profile**, select your profile
5. Click **Save**

### Set Default for New Items

1. Go to **Settings > General**
2. Under **Subtitle Settings**
3. Select **Default Language Profile**
4. This applies to all newly added content
5. Click **Save**

## Part 5: Manual Subtitle Operations

### Search for Subtitles Manually

1. Go to a movie or episode detail page
2. Click **Subtitles** tab
3. Click **Search**
4. Select desired language
5. Cinephage searches all enabled providers
6. Choose from results and click **Download**

### Upload Subtitles

If you have subtitle files:

1. Go to media detail page
2. Click **Subtitles** tab
3. Click **Upload**
4. Select subtitle file (.srt, .ass, .vtt)
5. Select language
6. Click **Upload**

### Sync Subtitles

If subtitles are out of sync:

1. Go to media detail page
2. Click **Subtitles** tab
3. Find the subtitle file
4. Click **Sync**
5. Cinephage uses alass algorithm to synchronize
6. Review and confirm the sync

## Part 6: Understanding Subtitle Scoring

Cinephage scores subtitle matches to select the best option:

### Scoring Factors

**Hash Match (Highest Priority):**

- Exact file hash match = Best quality
- Guaranteed sync
- Highest score

**Filename Match:**

- Subtitle filename matches media file = Good
- Release group match = Better
- High score

**Metadata Match:**

- Title match
- Year match
- Episode match (for TV)
- Medium score

**Uploader Reputation:**

- Trusted uploaders
- User ratings
- Slight score boost

### Score Thresholds

- **90-100**: Perfect or near-perfect match
- **70-89**: Good match, likely in sync
- **50-69**: Acceptable match
- **Below 50**: Poor match, may need manual sync

## Troubleshooting

### No Subtitles Found

**Problem:** Search returns no results

**Solutions:**

- Enable more subtitle providers
- Check language profile settings
- Verify file name is clear (not obfuscated)
- Try manual search with different language

### Subtitles Out of Sync

**Problem:** Subtitles do not match timing

**Solutions:**

- Use **Sync** feature in Cinephage
- Try different subtitle file
- Search for subtitles from same release group
- Manually adjust with external tool

### Wrong Language Downloaded

**Problem:** Subtitle is wrong language

**Solutions:**

- Check language profile is correct
- Verify subtitle metadata
- Report to provider if mislabeled
- Block specific subtitle in blacklist

### Download Limits Reached

**Problem:** "Download limit exceeded" errors

**Solutions:**

- Wait for limit reset (usually daily)
- Upgrade to VIP on OpenSubtitles
- Enable more providers to distribute load
- Reduce search frequency

### Subtitle File Not Detected

**Problem:** Downloaded subtitle not showing

**Solutions:**

- Check subtitle format (.srt, .ass, .vtt supported)
- Verify file permissions
- Ensure subtitle is in same folder as media
- Check file encoding (UTF-8 recommended)

## Best Practices

### Use Multiple Providers

Enable 3-5 providers minimum:

- Better coverage across languages
- Redundancy if one is down
- More options for rare content

### Set Clear Language Priorities

- Define required vs optional languages
- Set cutoff to avoid endless searching
- Use upgrade wisely for better matches

### Regular Maintenance

- Review subtitle settings periodically
- Remove unused providers
- Update language profiles as needs change
- Check for subtitle sync issues

### Storage Considerations

Subtitles are small files:

- ~50-200KB per subtitle file
- Minimal impact on storage
- Store alongside media files for portability

## Next Steps

Now that subtitles are configured:

- [Search and Download](../use/search-and-download) media with subtitle support
- [Set Up Live TV](live-tv) for live television with subtitles
- [Configure NZB Streaming](nzb-streaming) for streaming with subtitle support

## See Also

- [Supported Languages](../../reference/configuration/supported-languages)
- [Troubleshooting](../deploy/troubleshooting)
- [Quality Profiles](quality-profiles)
