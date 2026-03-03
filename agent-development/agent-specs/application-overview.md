# Application Overview

<!-- 
  ╔══════════════════════════════════════════════════════════════════════════════╗
  ║  THIS IS AN EXAMPLE — Replace this entire file with your project's details ║
  ╚══════════════════════════════════════════════════════════════════════════════╝
  
  This file should give any agent (or human) a quick understanding of what your
  application does, who it's for, and what the key workflows look like.
  
  Keep it concise — think "elevator pitch + main user journeys." The architecture
  details go in architecture-breakdown.md instead.
-->

## Purpose

A NestJS-based REST API for managing a personal book collection. Users can add books, organize them into shelves, track reading progress, and receive recommendations based on their reading history. The API is consumed by a separate front-end SPA (out of scope for this project).

## Core Workflows

1. **Book Management:** CRUD operations for books. Each book has a title, author, ISBN, genre, page count, and cover image URL. Books are validated against the OpenLibrary API on creation to auto-fill missing metadata.

2. **Shelf Organization:** Users create named shelves (e.g., "Currently Reading", "Sci-Fi Favorites") and assign books to one or more shelves. A book can live on multiple shelves simultaneously.

3. **Reading Progress:** Users log reading sessions (start page, end page, date). The API calculates completion percentage and estimated time to finish based on average reading speed.

4. **Recommendations:** A background job analyzes the user's genre distribution and reading patterns, then queries OpenLibrary for similar titles. Recommendations are refreshed daily via a scheduled task.

## Key UX Goals

- **Fast responses:** All list endpoints must support cursor-based pagination. No endpoint should take longer than 200ms under normal load.
- **Idempotent writes:** Book creation uses ISBN as a natural deduplication key. Repeated POST requests with the same ISBN return the existing record.
- **Graceful degradation:** If the OpenLibrary API is unreachable, book creation still succeeds with user-provided data only — metadata enrichment is retried later via the job queue.

## Out of Scope

- User authentication (handled by an external gateway — the API receives a verified `x-user-id` header)
- Front-end application
- Full-text search (planned for a future phase)