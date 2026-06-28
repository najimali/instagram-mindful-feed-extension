// content.tsx — Mindful Feed Engine entry point.
//
// Data flow:
//   IG DOM mutation
//     → DOM Scanner     (translate articles → FeedPost[])
//     → Feed Classifier (tag type + reason, runs inside scanner)
//     → State Manager   (deduplicate, store)
//     → Feature Engine  (filter pipeline: ads → suggested → reels)
//     → Layout Engine   (React UI in Shadow DOM)
//
// Route-awareness: only active on pathname "/". All other IG pages
// (Notifications, Messages, Profile, Explore) work untouched.

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
// @ts-ignore
import styles from './ui/styles.css?inline';

import type { FeedPost } from './core/types';
import { loadSettings, getSettings, onSettingsChange } from './core/settings-engine';
import { upsertPosts, patchPost, refilter, onFeedChange, getFeed } from './core/feed-state-manager';
import { watchDOM } from './core/performance-manager';
import { scanFeed } from './adapters/instagram/dom-scanner';
import { fetchFullSlides } from './adapters/instagram/media-api';
import { App } from './ui/App';

// ── Route helpers ─────────────────────────────────────────────────────────────

function isHomeFeed(): boolean {
  return window.location.pathname === '/' || window.location.pathname === '';
}

function getNavRight(): number {
  const candidates = [
    document.querySelector('nav'),
    document.querySelector('[role="navigation"]'),
  ].filter(Boolean) as Element[];
  let right = 0;
  for (const el of candidates) {
    const r = el.getBoundingClientRect().right;
    if (r > right && r < window.innerWidth * 0.4) right = r;
  }
  return Math.ceil(right) || 245;
}

// ── Caption expander ──────────────────────────────────────────────────────────

function expandAllCaptions(): Promise<void> {
  const btns = Array.from(
    document.querySelectorAll<HTMLElement>('main article button, main article [role="button"]')
  ).filter(el => el.textContent?.trim().toLowerCase() === 'more');
  if (!btns.length) return Promise.resolve();
  btns.forEach(btn => btn.click());
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

// ── Backfill carousel images from API ────────────────────────────────────────
// IG lazy-renders only the first ~3 slides in the DOM.
// After inserting posts we fetch the full list from the media API silently.

async function backfillSlides(posts: FeedPost[]): Promise<void> {
  const settings = getSettings();
  for (const post of posts) {
    // Only worth calling the API if the DOM gave us few slides (lazy-loading)
    // or if we got a blob video fallback (type=video, url===poster)
    const hasBlobFallback = post.slides.some(
      s => s.type === 'video' && s.url === s.poster
    );
    if (!hasBlobFallback && post.slides.length >= 3) continue;

    const full = await fetchFullSlides(post.id);
    if (full && full.length > 0) {
      patchPost(post.id, { slides: full }, settings);
    }
  }
}

// ── Main mount ────────────────────────────────────────────────────────────────

let host: HTMLDivElement | null = null;

function ensureMount() {
  if (host) return;

  const navRight = getNavRight();

  // CSS injected into the main document — hides IG's feed when we're active,
  // and ensures blob videos (MSE) remain visible even under visibility:hidden.
  const hideStyle = document.createElement('style');
  hideStyle.id = 'mfm-hide';
  hideStyle.textContent = `
    body.mfm-active main article {
      visibility: hidden !important;
      height: 0 !important;
      min-height: 0 !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    body.mfm-active main article video {
      visibility: visible !important;
    }
    body.mfm-active main aside,
    body.mfm-active main footer { display: none !important; }

    a[href="/reels/"],
    a[href*="/reels"],
    [aria-label="Reels"] { display: none !important; }
  `;
  document.head.appendChild(hideStyle);

  host = document.createElement('div');
  host.id = 'mfm-host';
  Object.assign(host.style, {
    position: 'fixed',
    top: '0',
    left: `${navRight}px`,
    right: '0',
    bottom: '0',
    zIndex: '9998',
    overflow: 'hidden',
    display: 'none',
  });
  document.body.appendChild(host);

  const shadow  = host.attachShadow({ mode: 'open' });
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);

  const container = document.createElement('div');
  container.style.cssText = 'height:100%;overflow-y:auto;overflow-x:hidden;';
  shadow.appendChild(container);

  // ── React root ──────────────────────────────────────────────────────────────
  function MindfulApp() {
    const [posts, setPosts] = useState<FeedPost[]>(getFeed);

    useEffect(() => {
      // Subscribe to state manager — re-render whenever feed changes
      const unsubFeed = onFeedChange(setPosts);

      // Subscribe to settings changes — refilter without re-scanning
      const unsubSettings = onSettingsChange(s => refilter(s));

      return () => { unsubFeed(); unsubSettings(); };
    }, []);

    return <App posts={posts} />;
  }

  createRoot(container).render(<MindfulApp />);
}

// ── Scan + ingest ─────────────────────────────────────────────────────────────

async function scanAndIngest(): Promise<void> {
  await expandAllCaptions();
  const posts    = scanFeed();
  const settings = getSettings();
  if (!posts.length) return;
  upsertPosts(posts, settings);
  backfillSlides(posts); // fire-and-forget
}

// ── Route management ──────────────────────────────────────────────────────────

function applyRoute(): void {
  ensureMount();
  if (!host) return;

  if (isHomeFeed()) {
    host.style.display = 'block';
    document.body.classList.add('mfm-active');
    scanAndIngest();
  } else {
    host.style.display = 'none';
    document.body.classList.remove('mfm-active');
  }
}

// ── SPA navigation detection via <title> MutationObserver ────────────────────
// Content scripts run in an isolated JS world — patching history.pushState
// has no effect on IG's code. <title> changes on every IG route change and
// IS observable from the content script world.

window.addEventListener('popstate', applyRoute);

const titleEl = document.querySelector('title');
if (titleEl) {
  new MutationObserver(applyRoute).observe(titleEl, { childList: true, characterData: true });
} else {
  new MutationObserver((_, obs) => {
    const t = document.querySelector('title');
    if (t) {
      obs.disconnect();
      new MutationObserver(applyRoute).observe(t, { childList: true, characterData: true });
    }
  }).observe(document.head, { childList: true });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function init() {
  await loadSettings();

  // DOM watcher: re-scan when IG React hydrates new articles
  watchDOM(document.body, () => {
    if (isHomeFeed()) scanAndIngest();
  });

  function waitForFeed() {
    if (document.querySelector('main article') || !isHomeFeed()) {
      applyRoute();
      return;
    }
    let tries = 0;
    const t = setInterval(() => {
      if (document.querySelector('main article') || ++tries > 150) {
        clearInterval(t);
        applyRoute();
      }
    }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForFeed);
  } else {
    waitForFeed();
  }
}

init();
