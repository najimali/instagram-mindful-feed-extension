// Feed State Manager — the extension's own representation of the feed.
// Instagram DOM is the input; this is the authoritative state everything
// else reads from. Deduplicates by post id across multiple scans.

import { FeedPost, Settings } from './types';
import { applyFeaturePipeline } from './feature-engine';

type Listener = (posts: FeedPost[]) => void;

let raw: FeedPost[]      = [];  // all classified posts, unfiltered
let filtered: FeedPost[] = [];  // after feature pipeline
const listeners = new Set<Listener>();

export function upsertPosts(incoming: FeedPost[], settings: Settings): void {
  const existingIds = new Set(raw.map(p => p.id));
  const fresh = incoming.filter(p => !existingIds.has(p.id));
  if (!fresh.length) return;

  raw      = [...raw, ...fresh];
  filtered = applyFeaturePipeline(raw, settings);
  notify();
}

export function patchPost(id: string, patch: Partial<FeedPost>, settings: Settings): void {
  raw      = raw.map(p => p.id === id ? { ...p, ...patch } : p);
  filtered = applyFeaturePipeline(raw, settings);
  notify();
}

export function refilter(settings: Settings): void {
  filtered = applyFeaturePipeline(raw, settings);
  notify();
}

export function getFeed(): FeedPost[] {
  return filtered;
}

export function onFeedChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach(fn => fn(filtered));
}
