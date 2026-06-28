// Instagram DOM Scanner — reads IG's rendered articles and produces FeedPost[].
// Only responsibility: translate IG DOM → structured data.

import { FeedPost, Slide, Author } from '../../core/types';
import { classifyArticle } from '../../core/feed-classifier';

const PROFILE_HREF = /^\/[^/]+\/?$/;
const SC_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function shortcodeToMediaId(shortcode: string): string {
  let id = BigInt(0);
  for (const c of shortcode) id = id * BigInt(64) + BigInt(SC_CHARS.indexOf(c));
  return id.toString();
}

function bestSrc(img: HTMLImageElement): string {
  if (img.srcset) {
    let best = '', bestW = 0;
    for (const entry of img.srcset.split(',')) {
      const parts = entry.trim().split(/\s+/);
      const w = parseInt(parts[1]) || 0;
      if (w > bestW) { best = parts[0]; bestW = w; }
    }
    if (best) return best;
  }
  return img.src;
}

function extractAuthor(article: Element): Author {
  const profileLink = Array.from(
    article.querySelectorAll<HTMLAnchorElement>('a[href^="/"]')
  ).find(a => PROFILE_HREF.test(a.getAttribute('href') || ''));

  const avatarEl = article.querySelector<HTMLImageElement>('img[alt*="profile picture" i]');

  return {
    username:    profileLink?.textContent?.trim() || '',
    displayName: profileLink?.textContent?.trim() || '',
    avatarUrl:   avatarEl?.src || '',
    profileUrl:  `https://www.instagram.com${profileLink?.getAttribute('href') || ''}`,
  };
}

// Extract a CDN video URL from a <video> element.
// IG puts the real URL in <source src>, or directly on video.src if not blob.
function videoSrc(el: HTMLVideoElement): string {
  // Prefer <source> child — IG usually puts the CDN mp4 there even when
  // video.src is a blob: wrapper.
  const source = el.querySelector<HTMLSourceElement>('source[src]');
  if (source?.src && !source.src.startsWith('blob:')) return source.src;
  if (el.src && !el.src.startsWith('blob:')) return el.src;
  // blob: URL — MSE stream, can't be transferred; fall back to poster
  return '';
}

function extractSlides(article: Element, avatarEl: HTMLImageElement | null): Slide[] {
  const slides: Slide[] = [];
  const seen = new Set<string>();

  const add = (s: Slide) => {
    const key = s.url || s.poster || '';
    if (key && !seen.has(key)) { seen.add(key); slides.push(s); }
  };

  // Carousel: <ul> contains one <li> per slide; each can be img or video
  const liEls = Array.from(article.querySelectorAll<HTMLElement>('ul > li'));
  if (liEls.length > 0) {
    for (const li of liEls) {
      const vid = li.querySelector<HTMLVideoElement>('video');
      if (vid) {
        const url    = videoSrc(vid);
        const poster = vid.poster || '';
        // Always add; if no CDN url use poster so the slot isn't blank
        add({ type: 'video', url: url || poster, poster: poster || undefined });
        continue;
      }
      const img = Array.from(li.querySelectorAll<HTMLImageElement>('img'))
        .find(i => i !== avatarEl && i.src && !i.src.startsWith('data:'));
      if (img) add({ type: 'image', url: bestSrc(img) });
    }
    return slides;
  }

  // Single video post
  const vid = article.querySelector<HTMLVideoElement>('video');
  if (vid) {
    const url    = videoSrc(vid);
    const poster = vid.poster || '';
    add({ type: 'video', url: url || poster, poster: poster || undefined });
    return slides;
  }

  // Single photo post — take first non-avatar, non-data img
  for (const img of Array.from(article.querySelectorAll<HTMLImageElement>('img'))) {
    if (img === avatarEl) continue;
    if (!img.src || img.src.startsWith('data:')) continue;
    add({ type: 'image', url: bestSrc(img) });
    break;
  }

  return slides;
}

function extractCaption(article: Element, username: string): string {
  const spans = Array.from(article.querySelectorAll<HTMLElement>('span[dir="auto"]'));
  const caption = spans
    .map(s => (s.textContent || '').trim())
    .filter(t => t.length > 5 && t !== username && t.toLowerCase() !== 'more')
    .sort((a, b) => b.length - a.length)[0] || '';
  return caption.replace(/\s*[…\.]{1,3}\s*more\s*$/i, '').trim();
}

export function scanArticle(article: Element): FeedPost | null {
  const shortcode = article.querySelector('a[href*="/p/"]')
    ?.getAttribute('href')?.match(/\/p\/([^/]+)\//)?.[1];
  if (!shortcode) return null;

  const { type, reason } = classifyArticle(article);
  const author   = extractAuthor(article);
  const avatarEl = article.querySelector<HTMLImageElement>('img[alt*="profile picture" i]');
  const slides   = extractSlides(article, avatarEl);
  const caption  = extractCaption(article, author.username);
  const timeEl   = article.querySelector('time');

  return {
    id: shortcode,
    type,
    reason,
    author,
    slides,
    caption,
    timestamp: timeEl?.getAttribute('datetime') || '',
  };
}

export function scanFeed(): FeedPost[] {
  const seen  = new Set<string>();
  const posts: FeedPost[] = [];
  for (const article of document.querySelectorAll('main article')) {
    const post = scanArticle(article);
    if (post && !seen.has(post.id)) {
      seen.add(post.id);
      posts.push(post);
    }
  }
  return posts;
}
