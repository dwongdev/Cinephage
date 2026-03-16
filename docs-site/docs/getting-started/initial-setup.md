---
title: Initial Setup
description: Complete the initial configuration of Cinephage after installation
sidebar_position: 3
date: 2025-03-16
tags: [setup, configuration, tutorial]
---

# Initial Setup

After installing Cinephage, you need to complete the initial setup to configure essential settings. This tutorial walks you through the setup wizard and initial configuration.

## Prerequisites

- Cinephage installed and running
- Access to the web interface at `http://localhost:3000`
- A TMDB account (free registration)

## Step 1: Access the Setup Wizard

When you first open Cinephage, you will see the setup wizard. This guides you through essential first-time configuration.

If you see a login screen instead of the wizard, initial setup has already been completed.

## Step 2: Create Admin Account

The first step is creating your administrator account:

1. Enter your **name**
2. Enter your **email address**
3. Create a **password** (minimum 8 characters)
4. Confirm your password
5. Click **Create Account**

This account has full administrative access to configure and manage Cinephage.

## Step 3: Get Your TMDB API Key

Cinephage uses The Movie Database (TMDB) for metadata. You need a free API key:

1. Go to [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
2. Log in or create a free account
3. Click **Request API Key**
4. Select **Developer**
5. Fill out the form:
   - **Type of Use**: Personal
   - **Application Name**: Cinephage
   - **Application URL**: Your Cinephage URL or `http://localhost:3000`
   - **Application Summary**: Personal media management
6. Agree to the terms and submit
7. Copy your **API Key** (not the API Read Access Token)

## Step 4: Configure TMDB in Cinephage

Return to the Cinephage setup wizard:

1. Paste your TMDB API Key into the field
2. Click **Verify** to test the connection
3. Once verified, click **Continue**

## Step 5: Set Root Folders

Root folders define where Cinephage stores your media library:

### Add a Movies Root Folder

1. Click **Add Root Folder**
2. Enter a name: `Movies`
3. Enter the path: `/media/movies` (or your actual path)
4. Click **Add**

### Add a TV Shows Root Folder

1. Click **Add Root Folder** again
2. Enter a name: `TV Shows`
3. Enter the path: `/media/tv` (or your actual path)
4. Click **Add**

**Path Guidelines:**

- Use the path as seen inside the Docker container
- If you mounted `/mnt/media:/media` in Docker, use `/media/movies`
- Ensure Cinephage has read/write permissions to these paths
- Do not nest root folders (e.g., do not put TV inside Movies)

## Step 6: Configure Download Client (Optional)

You can set up your download client now or skip and configure later:

### qBittorrent Setup

1. Select **qBittorrent** from the dropdown
2. Enter the host: `localhost` or your download client IP
3. Enter the port: `8080` (default qBittorrent web UI port)
4. Enter username and password
5. Click **Test** to verify connection
6. Click **Add**

### SABnzbd Setup

1. Select **SABnzbd** from the dropdown
2. Enter the URL: `http://localhost:8080`
3. Enter your API key from SABnzbd
4. Click **Test** to verify
5. Click **Add**

**Skip This Step:** If you do not have a download client yet, click **Skip**. You can configure this later in Settings.

## Step 7: Review Settings

Review your configuration:

- Admin account created
- TMDB API key verified
- Root folders added
- Download client configured (if added)

Click **Complete Setup** to finish.

## Step 8: First Login

You will be redirected to the login screen:

1. Enter your email and password
2. Click **Sign In**

You are now on the Cinephage dashboard.

## Post-Setup Configuration

After completing the wizard, configure these essential settings:

### 1. Quality Profiles

Navigate to **Settings > Profiles**:

1. Review the default profiles (Quality, Balanced, Compact, Streamer)
2. Select a default profile for movies
3. Select a default profile for TV shows
4. Click **Save**

### 2. Indexers

Navigate to **Settings > Integrations > Indexers**:

1. Click **Add Indexer**
2. Select an indexer from the list or add a custom YAML indexer
3. Configure settings:
   - API key (if required)
   - Categories (Movies, TV, etc.)
   - Priority (lower = higher priority)
4. Click **Test** to verify
5. Click **Save**

**Tip:** Start with one or two indexers. You can add more later.

### 3. Monitoring Settings

Navigate to **Settings > Tasks**:

1. Review the monitoring tasks
2. Enable tasks you want to run automatically:
   - Missing Content Search
   - Upgrade Monitoring
   - New Episode Detection
3. Set appropriate intervals
4. Click **Save**

## What You Have Accomplished

You have successfully:

- Created an admin account
- Configured TMDB API access
- Set up root folders for media storage
- Configured your download client (optional)
- Configured quality profiles
- Added indexers for content discovery
- Set up automatic monitoring

## Verify Everything Works

Test your setup:

1. Go to **Discover** in the navigation
2. Search for a movie you want to add
3. Click on it and then click **Add to Library**
4. Select your Movies root folder
5. Choose a quality profile
6. Enable monitoring
7. Click **Add**

The movie should appear in your **Library > Movies**.

## Next Steps

Now that Cinephage is fully configured, continue to [Adding Media](adding-media) to learn the complete workflow for adding and downloading content.

## Common Issues

### TMDB API Key Not Working

- Ensure you copied the **API Key**, not the Read Access Token
- Verify there are no extra spaces when pasting
- Check that your TMDB account is verified

### Cannot Access Root Folders

- Verify the volume mounts in Docker Compose
- Check file permissions (PUID/PGID settings)
- Ensure the folders exist on your host system

### Download Client Connection Failed

- If running in Docker, use the host IP instead of `localhost`
- Verify the download client web UI is enabled
- Check firewall rules

---

**Next:** [Adding Media →](adding-media)
