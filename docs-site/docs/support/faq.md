---
title: Frequently Asked Questions
description: Common questions and answers about Cinephage
sidebar_position: 1
date: 2025-03-16
tags: [faq, questions, support]
---

# Frequently Asked Questions

This page answers common questions about Cinephage.

## General Questions

### What is Cinephage?

Cinephage is a self-hosted media management platform that unifies movies, TV shows, live TV, and streaming into a single modern application.

### What does Cinephage replace?

Cinephage combines functionality from Radarr, Sonarr, Prowlarr, Bazarr, Overseerr, and FlareSolverr into one application.

### Is Cinephage free?

Yes, Cinephage is open source and free to use under the GPL-3.0 license.

## Installation Questions

### What are the system requirements?

- Docker and Docker Compose
- 512MB RAM minimum (1GB+ recommended)
- TMDB API key (free)

### How do I update Cinephage?

```bash
docker compose pull
docker compose up -d
```

## Troubleshooting

### Where are the logs?

Access logs via Docker:

```bash
docker compose logs -f
```

Or view in the web interface at **Settings > Logs**.

## See Also

- [Getting Help](../getting-started/getting-help)
- [Troubleshooting](../guides/deploy/troubleshooting)
