# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alcove is an end-to-end encrypted RSS reader built with React, Vite, and Evolu (a local-first CRDT database). The app stores all data locally, syncs encrypted data to a WebSocket relay server, and supports mnemonic-based backup/restore.

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Type check only
tsc -b

# Lint
npm run lint

# Preview production build
npm preview
```

## Architecture

### Database & State Management (Evolu)

**File:** `src/lib/evolu.ts`

Alcove uses Evolu, a local-first CRDT database that provides:
- End-to-end encrypted sync via WebSocket (`wss://relay.alcove.tools`)
- Mnemonic-based account backup/restore
- Soft-delete pattern (uses `isDeleted` flag, never hard deletes)
- Type-safe React hooks via `createUseEvolu`

**Critical Pattern:** Always use soft deletes:
```typescript
// WRONG - breaks CRDT sync
evolu.delete(table, id);

// CORRECT - use isDeleted flag
evolu.update(table, { id, isDeleted: sqliteTrue });
```

**Database Schema** (`src/lib/scheme.ts`):
- `rssFeed` - Feed metadata (url, title, description, category)
- `rssPost` - Individual posts (feedId, title, link, content, author, publishedDate)
- `readStatus` - Read/unread tracking per post
- `userPreferences` - User settings (theme, refresh interval)

All string fields use branded types with length constraints. Use pre-built queries in `evolu.ts` for type safety.

### RSS Feed Processing

**File:** `src/lib/feed-operations.ts`

**Feed Discovery Flow:**
1. Check if URL looks like direct feed (`looksLikeFeedUrl()`)
2. If not, try common paths: `/feed`, `/rss.xml`, `/atom.xml`, etc. (`discoverFeed()`)
3. Fetch with CORS proxy fallback (`fetchFeedWithFallback()`)
4. Parse XML and detect format: RSS 2.0, Atom 1.0, or RDF (`parseFeedXml()`)
5. Extract and sanitize data to match schema constraints
6. Insert into database

**Content Extraction:** Handles multiple field variations (`content:encoded`, `content`, `description`, `summary`) and format differences (CDATA, nested objects, strings).

**IMPORTANT:** Always sanitize feed data with `sanitizeFeedData()` and `sanitizePostData()` before inserting to prevent schema validation errors from truncated strings.

### OPML Import/Export

**File:** `src/lib/opml.ts`

- **Export:** Groups feeds by category, generates XML with hierarchy, triggers download
- **Import:** Parses OPML, fetches each feed's XML, extracts posts, inserts with category
- Progress tracking via Sonner toasts with success/error counts

### Component Structure

```
App.tsx
├── Initial onboarding (if no feeds)
├── Dashboard (main app)
│   ├── AppSidebar
│   │   ├── NavFeeds (category-grouped feeds)
│   │   ├── PostsList (search, filter, read status)
│   │   └── NavUser (settings, OPML, backup/restore)
│   └── Post content view (markdown rendering)
```

**Mobile Responsiveness:** Uses `useSidebar` hook and `md:` breakpoints. Sidebar toggles between feeds/posts views on mobile.

**Markdown Rendering:** Posts use `react-markdown` with `rehype-sanitize` for XSS protection and `rehype-raw` for HTML support. Relative image URLs are converted to absolute.

## Key Patterns

### Type Narrowing
Always narrow query results to eliminate null fields:
```typescript
const feeds = useQuery(allFeedsQuery).$narrowType(/* ... */);
```

### Search & Filter
Client-side filtering for instant feedback:
```typescript
const filtered = useMemo(() => {
  return posts.filter(p => p.title.includes(searchQuery))
             .sort((a, b) => /* date desc */);
}, [posts, searchQuery]);
```

### Error Handling
- User-friendly toast messages for errors
- Console logs for debugging
- Continue processing on partial failures (e.g., OPML import with some invalid feeds)

### State Management
- React `useState` for UI state
- Evolu for persistent, synced data
- `localStorage` for initialization flags

## Important Files

- `src/lib/evolu.ts` - Database setup, queries, hooks
- `src/lib/scheme.ts` - Database schema and types
- `src/lib/feed-operations.ts` - RSS fetching and parsing
- `src/lib/opml.ts` - OPML import/export
- `src/components/app-sidebar.tsx` - Main navigation
- `src/components/dashboard.tsx` - Post content view
- `src/App.tsx` - Root component and feed management

## Path Aliases

TypeScript/Vite configured with `@/*` alias mapping to `./src/*`:
```typescript
import { evolu } from "@/lib/evolu";
```

## Testing Feeds

When testing feed discovery or parsing, use these patterns:
- Common paths: `/feed`, `/rss.xml`, `/atom.xml`, `/rss`, `/feed.xml`, `/index.xml`
- Formats supported: RSS 2.0, Atom 1.0, RDF/RSS 1.0
- CORS proxy: `https://corsproxy.io/?{encodeURIComponent(url)}`
