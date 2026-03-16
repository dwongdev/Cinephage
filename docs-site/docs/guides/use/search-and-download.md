---
title: Search and Download
description: Find and acquire media using Cinephage's search and download system
sidebar_position: 1
date: 2025-03-16
tags: [search, download, media, workflow, guide]
---

# Search and Download

This guide explains how to search for media and download it using Cinephage's integrated search system.

## Goal

Find and download movies and TV shows from your configured indexers.

## Prerequisites

- Indexers configured and working
- Download client connected
- Quality profile set
- Media added to library with monitoring enabled

## Time Estimate

5-10 minutes per search

## Understanding the Search Process

Cinephage searches follow this workflow:

```
User Initiates Search → Query Indexers → Score Releases → Select Best → Send to Download Client → Monitor Progress → Import File
```

### Automatic vs Manual Search

**Automatic Search:**

- Triggered by monitoring tasks
- Runs on schedule (hourly by default)
- Finds best release automatically
- No user intervention needed

**Manual Search:**

- User initiates on specific item
- See all available releases
- Choose specific release
- Immediate action

## Part 1: Automatic Search

### How It Works

1. **Monitoring Tasks** run on schedule
2. Check all monitored items
3. Search indexers for missing/upgradable content
4. Score and select best release
5. Send to download client
6. Monitor until complete
7. Import and organize file

### Enable Automatic Search

1. Go to **Settings > Tasks**
2. Enable **Missing Content Search**
3. Set interval (default: hourly)
4. Enable **Upgrade Monitoring** (optional)
5. Click **Save**

### Monitor Automatic Searches

Check **Activity > History** to see:

- What was searched
- What was found
- What was grabbed
- Any errors

## Part 2: Manual Search

### Search a Movie

1. Go to **Library > Movies**
2. Find the movie you want
3. Click on it to open details
4. Click **Search** tab
5. Click **Search** button

### Review Results

Results appear with columns:

| Column      | Description                      |
| ----------- | -------------------------------- |
| **Indexer** | Source of the release            |
| **Title**   | Release name with quality info   |
| **Size**    | File size                        |
| **Peers**   | Seeders/Leechers (torrents only) |
| **Score**   | Quality score based on profile   |
| **Age**     | How old the release is           |
| **Grab**    | Button to download               |

### Understanding Scores

The **Score** column shows:

- **Green** (100+): Excellent quality match
- **Yellow** (50-99): Good quality
- **Red** (`<50`): Lower quality

Hover over score to see breakdown:

```
Base: 80 (1080p)
Source: +30 (WEB-DL)
Codec: +20 (x265)
Audio: +5 (AAC)
Custom: +10 (Preferred group)
Total: 145
```

### Grab a Release

1. Find desired release in results
2. Check score is acceptable
3. Click **Grab** button
4. Confirm in dialog
5. Release sent to download client

### Grab Best Release

To automatically grab highest-scoring release:

1. Click **Grab Best** button
2. Cinephage selects best option
3. No need to review individually

## Part 3: Search TV Episodes

### Search Entire Series

1. Go to **Library > TV**
2. Click on series
3. Click **Search** tab
4. Choose search type:
   - **Missing Episodes** - Only unwatched/missing
   - **All Episodes** - Everything monitored
   - **Selected Seasons** - Specific seasons
5. Click **Search**

### Search Specific Episode

1. Go to series details
2. Expand season
3. Find episode
4. Click episode to open details
5. Click **Search** tab
6. Click **Search** button

## Part 4: Search from Discover

### Search Before Adding

1. Go to **Discover**
2. Find movie or series
3. Click on it
4. See **Available Releases** count
5. Click to view release list
6. Review quality options
7. Then click **Add to Library** to download

### Preview Quality Availability

In Discover view:

- **Green badge**: High-quality releases available
- **Yellow badge**: Medium quality available
- **Red badge**: Only low quality available
- **No badge**: Not searched yet

## Part 5: Advanced Search Options

### Filter Results

In search results, filter by:

**Quality:**

- 2160p (4K)
- 1080p
- 720p
- 480p

**Source:**

- BluRay
- WEB-DL
- HDTV
- DVD

**Custom:**

- Minimum score
- Maximum age
- Specific indexers

### Sort Results

Click column headers to sort:

- **Score** - Best quality first
- **Size** - Smallest or largest
- **Age** - Newest or oldest
- **Peers** - Most seeders (torrents)

### Compare Releases

To compare similar releases:

1. Select multiple releases (checkbox)
2. Click **Compare**
3. See side-by-side comparison:
   - Resolution
   - Source
   - Codec
   - Audio
   - Score breakdown

## Part 6: Handling Search Results

### No Results Found

If search returns nothing:

1. **Check indexers:**
   - Verify indexers are enabled
   - Test indexer connections
   - Check indexer categories

2. **Try different search:**
   - Search by TMDB ID (in URL: `/discover/movie/27205`)
   - Use alternate titles
   - Wait and try later (new releases)

3. **Check filters:**
   - Remove quality filters temporarily
   - Check custom formats are not blocking
   - Verify language settings

### Too Many Results

If overwhelmed with results:

1. **Apply filters:**
   - Filter by minimum score
   - Filter by resolution
   - Filter by source

2. **Sort appropriately:**
   - Sort by score to see best first
   - Sort by size for storage concerns

3. **Refine quality profile:**
   - Tighten custom formats
   - Adjust scoring rules
   - Block unwanted sources

### Low Scores

If best score is low:

1. **Check quality profile:**
   - Verify profile assigned to item
   - Check cutoff settings
   - Review custom format scores

2. **Consider waiting:**
   - Better releases may appear later
   - Enable upgrade monitoring
   - Set appropriate cutoff

## Part 7: After Grab

### Monitor Download

1. Go to **Activity > Queue**
2. See download progress
3. Click item for details:
   - Download speed
   - ETA
   - File size
   - Release details

### Download Complete

When download finishes:

1. Cinephage detects completion
2. File imported automatically
3. Organized according to naming settings
4. Added to library
5. Notifications sent (if configured)

### Failed Downloads

If download fails:

1. Check **Activity > History**
2. See failure reason
3. Check **Activity > Blocklist**
4. Release may be auto-blocklisted
5. Next search will try different release

## Part 8: Search Best Practices

### Quality over Speed

- Do not grab first available
- Wait for quality releases
- Use cutoff to prevent endless upgrading

### Diversify Indexers

- Use multiple indexers for coverage
- Different indexers have different content
- Some specialize in specific types

### Monitor, Do Not Just Search

- Add items with monitoring enabled
- Let automatic search work
- Manual search for immediate needs only

### Respect Rate Limits

- Do not search too frequently
- Indexers have API limits
- Use reasonable monitoring intervals

### Review Before Grabbing

- Check release names for quality indicators
- Verify file sizes are reasonable
- Look at release groups (if you have preferences)

## Troubleshooting

### Searches Take Too Long

**Problem:** Searching is very slow

**Solutions:**

- Reduce number of enabled indexers
- Disable slow indexers
- Check network connectivity
- Increase indexer timeout settings

### Results Not Appearing

**Problem:** No results from working indexers

**Solutions:**

- Check indexer categories are correct
- Verify API keys are valid
- Test indexer individually
- Check for indexer site issues

### Wrong Quality Downloaded

**Problem:** Lower quality than expected

**Solutions:**

- Check quality profile assigned
- Verify cutoff is set correctly
- Review custom format scores
- Check if better release was filtered

### Cannot Grab Release

**Problem:** Grab button does nothing or errors

**Solutions:**

- Check download client connection
- Verify download client has space
- Check path mappings
- Review download client logs

## Next Steps

After searching and downloading:

- [Monitor and Upgrade](monitor-and-upgrade) for quality improvements
- [Handle Failed Downloads](handle-failed-downloads) for retry strategies
- [Import Existing Files](import-existing-files) for your current library

## See Also

- [Configure Indexers](../configure/indexers)
- [Quality Profiles](../configure/quality-profiles)
- [Troubleshooting](../deploy/troubleshooting)
