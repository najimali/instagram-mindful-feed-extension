// Feed Classifier — labels every raw post with a type and reason.
// This is the "brain": everything downstream works from classified data,
// never raw HTML.

import { PostType, PostReason } from './types';

export interface Classification {
  type: PostType;
  reason: PostReason;
}

export function classifyArticle(article: Element): Classification {
  const type   = detectType(article);
  const reason = detectReason(article);
  return { type, reason };
}

// ── Type detection ────────────────────────────────────────────────────────────

function detectType(article: Element): PostType {
  // Reel: product_type=clips or /reel/ permalink
  const reelLink = article.querySelector('a[href*="/reel/"]');
  if (reelLink) return 'reel';

  // Video: has a <video> element
  if (article.querySelector('video')) return 'video';

  // Carousel: has a <ul> with multiple <li> slides
  const slides = article.querySelectorAll('ul > li');
  if (slides.length > 1) return 'carousel';

  // Photo: single image
  if (article.querySelector('img:not([alt*="profile picture" i])')) return 'photo';

  return 'unknown';
}

// ── Reason detection ──────────────────────────────────────────────────────────
// Order matters — most specific signals first.

function detectReason(article: Element): PostReason {
  // Sponsored: no <time> element (IG shows "Sponsored" text instead)
  if (!article.querySelector('time')) return 'sponsored';

  // Suggested: explicit label text or aria
  const text = article.textContent || '';
  if (/suggested for you/i.test(text)) return 'suggested';
  if (article.querySelector('[aria-label*="Suggested" i]')) return 'suggested';

  // Suggested: Follow button anywhere in article (not following this account)
  const buttons = Array.from(article.querySelectorAll('button, [role="button"]'));
  if (buttons.some(b => b.textContent?.trim().toLowerCase() === 'follow')) return 'suggested';

  return 'following';
}
