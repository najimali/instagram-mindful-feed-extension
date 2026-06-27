// extract.ts — pull post data from IG's rendered <article> elements.
// Key stable hooks:
//   span[dir="auto"]  → user-written text (captions, comments). IG has used this for years.
//   img[alt*="profile picture"]  → avatar
//   a[href^="/username/"]  → profile link
//   video  → video posts (no img, just a <video> element)

export interface Post {
  id: string;
  username: string;
  userHref: string;
  avatarSrc: string;
  images: string[];        // photo src(s)
  video: string | null;    // video src for display purposes
  videoPoster: string | null;
  // Reference to IG's actual <video> element — moving it (not cloning) preserves the loaded buffer
  videoEl: HTMLVideoElement | null;
  caption: string;
  timestamp: string;
}

const PROFILE_HREF = /^\/[^/]+\/?$/; // /username/ — not /p/… or /explore/

function bestSrc(img: HTMLImageElement): string {
  if (img.srcset) {
    let best = '', bestW = 0;
    for (const entry of img.srcset.split(',')) {
      const parts = entry.trim().split(/\s+/);
      const url = parts[0];
      const w = parseInt(parts[1]) || 0;
      if (w > bestW) { best = url; bestW = w; }
    }
    if (best) return best;
  }
  return img.src;
}

export function extractPost(article: Element): Post | null {
  // Stable post ID from permalink
  const shortcode = article.querySelector('a[href*="/p/"]')
    ?.getAttribute('href')?.match(/\/p\/([^/]+)\//)?.[1];
  if (!shortcode) return null;

  // Username + profile href
  const profileLink = Array.from(
    article.querySelectorAll<HTMLAnchorElement>('a[href^="/"]')
  ).find(a => PROFILE_HREF.test(a.getAttribute('href') || ''));
  const username = profileLink?.textContent?.trim() || '';
  const userHref = `https://www.instagram.com${profileLink?.getAttribute('href') || ''}`;

  // Avatar
  const avatarEl = article.querySelector<HTMLImageElement>('img[alt*="profile picture" i]');
  const avatarSrc = avatarEl?.src || '';

  // ── Video post ────────────────────────────────────────────────────────────
  const videoEl = article.querySelector<HTMLVideoElement>('video');
  const video = videoEl
    ? (videoEl.src && videoEl.src !== window.location.href ? videoEl.src
      : videoEl.querySelector('source')?.getAttribute('src') || null)
    : null;
  const videoPoster = videoEl?.poster || null;
  // Keep a reference to IG's actual element — we'll move (not clone) it so the buffer plays

  // ── Photos ────────────────────────────────────────────────────────────────
  // Only collect if this isn't a video post (video posts have no real imgs)
  const images: string[] = [];
  if (!videoEl) {
    const seen = new Set<string>();
    for (const img of Array.from(article.querySelectorAll<HTMLImageElement>('img'))) {
      if (img === avatarEl) continue;
      if (!img.src || img.src.startsWith('data:')) continue;
      const src = bestSrc(img);
      if (src && !seen.has(src)) { seen.add(src); images.push(src); }
    }
  } else if (videoPoster) {
    // For video posts, use the poster as the thumbnail in the carousel
    images.push(videoPoster);
  }

  // ── Caption ───────────────────────────────────────────────────────────────
  // IG marks ALL user-written text with dir="auto" (captions, bio, comments).
  // Take the longest such span that isn't just the username or UI chrome.
  const captionSpans = Array.from(article.querySelectorAll<HTMLElement>('span[dir="auto"]'));
  let caption = captionSpans
    .map(s => (s.textContent || '').trim())
    .filter(t => t.length > 5 && t !== username && t.toLowerCase() !== 'more')
    .sort((a, b) => b.length - a.length)[0] || '';

  // Strip any trailing "… more" / "...more" that survived (truncated caption not yet expanded)
  caption = caption.replace(/\s*[…\.]{1,3}\s*more\s*$/i, '').trim();

  // Timestamp
  const timeEl = article.querySelector('time');
  const timestamp = timeEl?.getAttribute('datetime') || '';

  return { id: shortcode, username, userHref, avatarSrc, images, video, videoPoster, videoEl, caption, timestamp };
}

export function parseFeed(): Post[] {
  const seen = new Set<string>();
  const posts: Post[] = [];
  for (const art of document.querySelectorAll('main article')) {
    const post = extractPost(art);
    if (post && !seen.has(post.id)) {
      seen.add(post.id);
      posts.push(post);
    }
  }
  return posts;
}
