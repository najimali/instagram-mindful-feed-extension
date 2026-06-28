// Instagram Media API adapter — fetches full carousel images and post metadata
// from IG's private API using the browser's existing authenticated session.

import { shortcodeToMediaId } from './dom-scanner';

const IG_HEADERS = {
  'X-IG-App-ID':      '936619743392459',
  'X-Requested-With': 'XMLHttpRequest',
};

export async function fetchFullCarousel(shortcode: string): Promise<string[] | null> {
  try {
    const mediaId = shortcodeToMediaId(shortcode);
    const resp    = await fetch(`/api/v1/media/${mediaId}/info/`, {
      headers: IG_HEADERS,
    });
    if (!resp.ok) return null;

    const data = await resp.json();
    const item = data?.items?.[0];
    if (!item) return null;

    if (item.carousel_media?.length) {
      return item.carousel_media
        .map((c: any) => c.image_versions2?.candidates?.[0]?.url || '')
        .filter(Boolean);
    }

    const url = item.image_versions2?.candidates?.[0]?.url || '';
    return url ? [url] : null;
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
