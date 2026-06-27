// observer.ts — watches for IG's React hydration completing and fires a callback
// when new posts are available. Throttled to one scan per animation frame.

import { parseFeed } from './extract';
export type { Post } from './extract';

export function watchFeed(onPosts: (posts: import('./extract').Post[]) => void | Promise<void>): () => void {
  let pending = false;

  function scan() {
    const posts = parseFeed();
    if (posts.length > 0) onPosts(posts);
  }

  const observer = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; scan(); });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial scan (articles may already be in DOM at idle)
  scan();

  return () => observer.disconnect();
}
