// Feature Engine — a pipeline of independent filter functions.
// Each filter takes the current feed and returns a (possibly smaller) feed.
// Add new filters here without touching any other module.

import { FeedPost, Settings } from './types';

type Filter = (posts: FeedPost[], settings: Settings) => FeedPost[];

// ── Filters ───────────────────────────────────────────────────────────────────

const removeSuggested: Filter = (posts, s) =>
  s.hideSuggested ? posts.filter(p => p.reason !== 'suggested') : posts;

const removeSponsored: Filter = (posts, s) =>
  s.hideSponsored ? posts.filter(p => p.reason !== 'sponsored') : posts;

const removeReels: Filter = (posts, s) =>
  s.hideReels ? posts.filter(p => p.type !== 'reel') : posts;

// Pipeline: each filter runs in order.
// Raw feed → remove ads → remove suggested → remove reels → final feed
const PIPELINE: Filter[] = [
  removeSponsored,
  removeSuggested,
  removeReels,
];

export function applyFeaturePipeline(posts: FeedPost[], settings: Settings): FeedPost[] {
  return PIPELINE.reduce((acc, filter) => filter(acc, settings), posts);
}
