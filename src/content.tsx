// content.tsx — replaces ONLY Instagram's home feed.
// On non-home routes (Notifications, Profile, Search, etc.) the overlay hides itself
// so IG's own pages work untouched.

import { createRoot } from 'react-dom/client';
import { useState, useEffect } from 'react';
import { parseFeed, Post } from './extract';
import { watchFeed } from './observer';
import { App } from './ui/App';
// @ts-ignore
import styles from './ui/styles.css?inline';

// ── Route detection ──────────────────────────────────────────────────────────
function isHomeFeed(): boolean {
  return window.location.pathname === '/' || window.location.pathname === '';
}

// ── Nav measurement ──────────────────────────────────────────────────────────
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

// ── Caption expander ─────────────────────────────────────────────────────────
function expandAllCaptions(): Promise<void> {
  const btns = Array.from(
    document.querySelectorAll<HTMLElement>('main article button, main article [role="button"]')
  ).filter(el => el.textContent?.trim().toLowerCase() === 'more');

  if (btns.length === 0) return Promise.resolve();
  btns.forEach(btn => btn.click());
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

// ── Main mount (runs once) ───────────────────────────────────────────────────
let host: HTMLDivElement | null = null;

function ensureMount() {
  if (host) return;

  const navRight = getNavRight();

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
    body.mfm-active main aside,
    body.mfm-active main footer { display: none !important; }

    /* Always hide Reels nav link */
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

  const shadow = host.attachShadow({ mode: 'open' });
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);
  const container = document.createElement('div');
  container.style.cssText = 'height:100%;overflow-y:auto;overflow-x:hidden;';
  shadow.appendChild(container);

  function MindfulApp() {
    const [posts, setPosts] = useState<Post[]>([]);

    useEffect(() => {
      expandAllCaptions().then(() => {
        const initial = parseFeed();
        if (initial.length) setPosts(initial);
      });

      const stop = watchFeed(async incoming => {
        await expandAllCaptions();
        setPosts(prev => {
          const ids = new Set(prev.map(p => p.id));
          const fresh = incoming.filter(p => !ids.has(p.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
      });
      return stop;
    }, []);

    return <App posts={posts} />;
  }

  createRoot(container).render(<MindfulApp />);
}

// ── Show/hide based on current route ────────────────────────────────────────
function applyRoute() {
  ensureMount();
  if (!host) return;

  if (isHomeFeed()) {
    host.style.display = 'block';
    document.body.classList.add('mfm-active');
  } else {
    host.style.display = 'none';
    document.body.classList.remove('mfm-active');
  }
}

// ── Detect SPA navigation via <title> MutationObserver ──────────────────────
// Content scripts are in an isolated JS world — patching history.pushState has
// no effect on IG's code. <title> changes on every IG route change and IS
// observable from the content script world.

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

// ── Bootstrap ────────────────────────────────────────────────────────────────
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
