// Core types shared across all engines.
// Platform-specific adapters translate their DOM into these structures.

export type PostType =
  | 'photo'
  | 'carousel'
  | 'video'
  | 'reel'
  | 'story'
  | 'unknown';

export type PostReason =
  | 'following'     // from an account you follow
  | 'suggested'     // IG algorithmic suggestion
  | 'sponsored'     // paid advertisement
  | 'explore'       // surfaced from Explore
  | 'unknown';

export interface Author {
  username: string;
  displayName: string;
  avatarUrl: string;
  profileUrl: string;
}

// One visual item inside a post (image or playable video).
// For blob/DASH videos we degrade to the poster image because MediaSource
// bindings can't be transferred across DOM trees.
export interface Slide {
  type: 'image' | 'video';
  url: string;     // image URL  OR  video CDN URL
  poster?: string; // video thumbnail (also used as fallback)
}

export interface FeedPost {
  id: string;
  type: PostType;
  reason: PostReason;
  author: Author;
  slides: Slide[];
  caption: string;
  timestamp: string;
}

export interface Settings {
  readingMode: boolean;
  hideComments: boolean;
  hideLikes: boolean;
  hideReels: boolean;
  hideSuggested: boolean;
  hideSponsored: boolean;
  dailyLimitMinutes: number;
}

export const DEFAULT_SETTINGS: Settings = {
  readingMode: true,
  hideComments: true,
  hideLikes: true,
  hideReels: true,
  hideSuggested: true,
  hideSponsored: true,
  dailyLimitMinutes: 0,
};
