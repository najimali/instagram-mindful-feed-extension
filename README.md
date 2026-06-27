# Instagram Mindful Feed

A Chrome extension that replaces Instagram's algorithmic, engagement-optimised feed with a calm, book-style reading experience — showing only the content you intentionally chose to follow.

---

## Vision

Instagram's default feed is engineered for compulsive use: algorithmic recommendations, infinite scroll, engagement metrics, and dopamine loops. This extension removes all of that and gives you back control.

The experience should feel closer to **reading a magazine or book** than scrolling through social media.

---

## How It Works

The extension does not try to restyle Instagram's DOM (which is deeply nested, class-hashed, and React-re-rendered — every CSS override approach breaks). Instead:

1. **Extracts** post data (username, avatar, images, video, caption) from Instagram's already-rendered feed articles using stable DOM attributes (`span[dir="auto"]`, `img[alt*="profile picture"]`, post permalink shortcodes).
2. **Hides** Instagram's feed container, leaving the nav, stories, and all other pages untouched.
3. **Mounts a custom React + Tailwind UI** inside a Shadow DOM (full style isolation) that renders the extracted posts as a two-column book-style reading view.
4. **Route-aware**: detects SPA navigation via `<title>` MutationObserver (the only cross-world signal available to content scripts) and hides itself on non-home pages so Notifications, Messages, Profile, Search etc. work normally.

---

## Features Implemented (v3)

### Feed Replacement
- [x] Extracts posts from IG's rendered DOM — no API calls, no auth required
- [x] Expands truncated captions by clicking IG's "more" button before extraction
- [x] Filters out "Like…Comment…Repost…" action-bar text from captions using `span[dir="auto"]`
- [x] Deduplicates posts by shortcode ID across observer scans

### Reading UI
- [x] Two-column book layout: photo left (55%), caption right (45%)
- [x] Warm paper aesthetic (`#faf7f2` cream, Georgia serif, `#f0e8dc` background)
- [x] One post at a time — no infinite scroll
- [x] Page-turn navigation with slide-in animation (directional: right for next, left for prev)
- [x] Keyboard navigation: ← → arrow keys to turn pages
- [x] Page counter ("3 / 12") in the nav bar
- [x] Prev / Next buttons with disabled state at boundaries

### Media
- [x] Single photos: `object-fit: contain` (full image, no crop — matches IG's own viewer)
- [x] Carousels: imperative `scrollTo` on the scroll-snap track (fixes the React-state-only bug)
- [x] Dot indicators + prev/next arrows for carousel posts
- [x] Video posts: physically **moves** IG's actual `<video>` element into our container (preserves the loaded media buffer — cloning a `<video>` loses the stream)
- [x] Video controls enabled, `playsInline`

### Navigation hygiene
- [x] Left nav untouched (Home, Messages, Search, Create, Profile all work)
- [x] Reels link hidden from nav
- [x] Overlay shows **only on the home feed** (`pathname === "/"`)
- [x] SPA route changes detected via `<title>` MutationObserver (patching `history.pushState` doesn't work in content script isolated world)
- [x] Overlay hides instantly when navigating to Messages, Notifications, Profile, etc.

---

## Architecture

```
src/
  content.tsx      Entry point. Mounts shadow DOM host, wires route detection,
                   manages overlay show/hide via body.mfm-active class.

  extract.ts       parseFeed() — walks main article elements, extracts Post objects.
                   Uses span[dir="auto"] for captions, profile-link regex for username,
                   naturalWidth fallback + src dedup for images, video element ref for video.

  observer.ts      MutationObserver on document.body, rAF-throttled, calls parseFeed()
                   and pushes new posts to a callback.

  ui/
    App.tsx        Single-post viewer. Manages current page index, direction state,
                   page-turn animation key, keyboard handler.

    PostPage.tsx   Two-column article card. PhotoCarousel (imperative scrollTo),
                   VideoPanel (moves IG's real <video> node), author header, caption,
                   footer link.

    styles.css     Tailwind base + page-turn keyframe animations + carousel CSS.
```

### Key DOM facts (from live inspection)

```
article
└── div  (wrapper — article's ONLY child)
    ├── div  [media]    carousel <ul> or single img / video
    ├── div  [actions]  like/comment/share bar — not rendered in our UI
    └── div  [caption]  username link + span[dir="auto"] caption text
```

Instagram's class names are hashed and churn on every deploy. All selectors use stable structural attributes:

| What | Selector |
|------|----------|
| User caption | `span[dir="auto"]` |
| Avatar | `img[alt*="profile picture" i]` |
| Profile link | `a[href^="/"]` matching `/^\/[^/]+\/?$/` |
| Post permalink | `a[href*="/p/"]` |
| Timestamp | `time[datetime]` |

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Extension API | Manifest V3 | Current Chrome standard |
| UI framework | React 18 | Component model, hooks for imperative video/scroll |
| Styling | Tailwind CSS v3 + inline styles | Tailwind for utilities; inline styles for dynamic values in shadow DOM |
| Bundler | Vite + `@vitejs/plugin-react` | Fast, zero-config IIFE output for content scripts |
| Style isolation | Shadow DOM (`attachShadow`) | IG's global CSS cannot leak in; our styles cannot leak out |
| Language | TypeScript | Type safety on the Post interface and DOM queries |

---

## Project Structure

```
instagram-mindful-feed-extension/
├── src/                    Source files
│   ├── content.tsx         Extension entry point
│   ├── extract.ts          DOM → Post data extraction
│   ├── observer.ts         MutationObserver feed watcher
│   └── ui/
│       ├── App.tsx         Page-turn feed viewer
│       ├── PostPage.tsx    Single post card (photo/video + caption)
│       └── styles.css      Tailwind + animations
├── public/
│   └── icons/              16 / 48 / 128 px extension icons
├── dist/                   Build output (gitignored — run npm run build)
├── manifest.json           MV3 extension manifest
├── vite.config.ts          IIFE build config, copies manifest + icons
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── package.json
```

---

## Setup & Development

### Prerequisites
- Node.js 18+
- Chrome / Chromium-based browser (Edge, Brave, Arc)

### Install & Build

```bash
npm install
npm run build       # produces dist/
npm run dev         # watch mode — rebuilds on file changes
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the `dist/` folder
4. Open `instagram.com` — log in if needed

After any source change:
1. Run `npm run build` (or use `npm run dev` for watch mode)
2. Click the **refresh icon** on the extension card in `chrome://extensions`
3. Hard-refresh instagram.com (`⌘⇧R`)

---

## Roadmap

### Near-term
- [ ] Infinite scroll: keep IG's feed alive (hidden, off-screen) and nudge its scroll position to trigger pagination; append new posts as they hydrate
- [ ] Reading time estimate per caption ("~45 sec read")
- [ ] "Caught up" screen after the last post
- [ ] Popup toggle (enable/disable the extension without uninstalling)

### Future
- [ ] Daily post limit (e.g. 20 posts/day then a soft stop)
- [ ] Slow-scroll mode: deliberate friction between posts
- [ ] Reading progress: posts read / time spent (local only, no sync)
- [ ] Focus mode: hide all social metrics site-wide
- [ ] Caption summarisation (local AI / Claude API, opt-in)
- [ ] Categorise followed accounts by topic
- [ ] Detect and optionally hide clickbait captions

---

## Known Limitations

- **Captions are IG-length**: IG truncates very long captions in the DOM. The extension clicks the "more" button to expand them before extraction, but the caption is still whatever IG renders — not the full original text from the API.
- **Video src availability**: IG's video URLs are short-lived signed CDN tokens. The extension moves IG's real `<video>` element (preserving its buffer) rather than re-fetching — this means video only works on posts that were already loaded in the feed.
- **First-page only**: currently renders the initial batch (~12 posts). Infinite scroll pagination is on the roadmap.
- **Selector fragility**: Instagram deploys frequently. If IG changes `span[dir="auto"]`, the profile-link pattern, or the `alt` attribute on post images, `extract.ts` is the single file to fix.
- **Chrome only**: Manifest V3 content scripts with Shadow DOM work in all Chromium browsers (Edge, Brave, Arc). Firefox uses a different MV3 implementation — not tested.
