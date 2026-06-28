// Instagram Media API adapter — fetches full carousel slides and post metadata
// from IG's private API using the browser's existing authenticated session.

import { shortcodeToMediaId } from './dom-scanner';
import { Slide } from '../../core/types';

const IG_HEADERS = {
  'X-IG-App-ID':      '936619743392459',
  'X-Requested-With': 'XMLHttpRequest',
};

function bestImage(item: any): string {
  return item?.image_versions2?.candidates?.[0]?.url || '';
}

function bestVideo(item: any): string {
  const vv = item?.video_versions;
  return vv?.[0]?.url || '';
}

export async function fetchFullSlides(shortcode: string): Promise<Slide[] | null> {
  try {
    const mediaId = shortcodeToMediaId(shortcode);
    const resp    = await fetch(`/api/v1/media/${mediaId}/info/`, {
      headers: IG_HEADERS,
    });
    if (!resp.ok) return null;

    const data = await resp.json();
    const item = data?.items?.[0];
    if (!item) return null;

    // Carousel: each carousel_media entry can be image or video
    if (item.carousel_media?.length) {
      return (item.carousel_media as any[]).map((c): Slide => {
        const vurl = bestVideo(c);
        if (vurl) return { type: 'video', url: vurl, poster: bestImage(c) || undefined };
        return { type: 'image', url: bestImage(c) };
      }).filter(s => s.url);
    }

    // Single video
    const vurl = bestVideo(item);
    if (vurl) return [{ type: 'video', url: vurl, poster: bestImage(item) || undefined }];

    // Single image
    const iurl = bestImage(item);
    return iurl ? [{ type: 'image', url: iurl }] : null;
  } catch {
    return null;
  }
}

export async function fetchFollowingUsernames(myPk: string): Promise<Set<string>> {
  try {
    const resp = await fetch(`/api/v1/friendships/${myPk}/following/?count=200`, {
      headers: IG_HEADERS,
    });
    if (!resp.ok) return new Set();
    const data  = await resp.json();
    const users = data?.users || [];
    return new Set(users.map((u: any) => u.username as string));
  } catch {
    return new Set();
  }
}
