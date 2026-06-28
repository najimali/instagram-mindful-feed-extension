// Instagram DOM Scanner — reads IG's rendered articles and produces FeedPost[].
// Only responsibility: translate IG DOM → structured data.
// Classification happens in FeedClassifier, not here.

import { FeedPost, Author } from '../../core/types';
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

function extractImages(article: Element, avatarEl: HTMLImageElement | null, hasVideo: boolean): string[] {
  if (hasVideo) return [];

  const carouselImgs = Array.from(
    article.querySelectorAll<HTMLImageElement>('ul img')
  ).filter(img => img !== avatarEl && img.src && !img.src.startsWith('data:'));

  const seen = new Set<string>();
  const images: string[] = [];

  if (carouselImgs.length > 0) {
    for (const img of carouselImgs) {
      const src = bestSrc(img);
      if (src && !seen.has(src)) { seen.add(src); images.push(src); }
    }
  } else {
    for (const img of Array.from(article.querySelectorAll<HTMLImageElement>('img'))) {
      if (img === avatarEl) continue;
      if (!img.src || img.src.startsWith('data:')) continue;
      const src = bestSrc(img);
      if (src) { images.push(src); break; }
    }
  }

  return images;
}

function extractCaption(article: Element, username: string): string {
  const spans = Array.from(article.querySelectorAll<HTMLElement>('span[dir="auto"]'));
  let caption = spans
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
  const videoEl  = article.querySelector<HTMLVideoElement>('video');
  const images   = extractCaption(article, author.username)
    ? extractImages(article, avatarEl, !!videoEl)
    : extractImages(article, avatarEl, !!videoEl);

  const videoPoster = videoEl?.poster || null;
  if (videoEl && videoPoster) images.push(videoPoster);

  const caption   = extractCaption(article, author.username);
  const timeEl    = article.querySelector('time');
  const timestamp = timeEl?.getAttribute('datetime') || '';

  return {
    id: shortcode,
    type,
    reason,
    author,
    images,
    videoEl:     videoEl || null,
    videoPoster,
    caption,
    timestamp,
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
