export function normalizeInstagramUsername(input: string): string {
  const value = String(input || '').trim();
  if (!value) return '';

  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    return (parts[0] || '').replace(/^@/, '');
  } catch {
    return value.replace(/^@/, '').replace(/^\/+|\/+$/g, '');
  }
}

export function parseInstagramPostRef(input: string): { shortcode: string; kind: 'p' | 'reel' | 'tv' } | null {
  const value = String(input || '').trim();
  if (!value) return null;

  const match = value.match(/(?:instagram\.com\/)?(p|reel|tv)\/([^/?#]+)/i);
  if (match) {
    return {
      kind: match[1].toLowerCase() as 'p' | 'reel' | 'tv',
      shortcode: match[2],
    };
  }

  if (/^[A-Za-z0-9_-]{5,}$/.test(value)) {
    return { kind: 'p', shortcode: value };
  }

  return null;
}

export function parseCount(raw: string): number {
  const value = decodeHtmlEntities(raw).trim().toLowerCase().replace(/,/g, '');
  const match = value.match(/([\d.]+)\s*([kmb])?/);
  if (!match) return 0;

  const base = parseFloat(match[1]);
  const suffix = match[2];
  if (!suffix) return Number.isFinite(base) ? Math.round(base) : 0;

  const multipliers: Record<string, number> = {
    k: 1_000,
    m: 1_000_000,
    b: 1_000_000_000,
  };

  return Math.round(base * (multipliers[suffix] || 1));
}

export function decodeHtmlEntities(input: string): string {
  return String(input || '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, '\'')
    .replace(/&apos;/g, '\'')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

export interface InstagramMetaProfile {
  ogTitle?: string;
  ogDescription?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
}

export interface InstagramProfileSummary {
  username: string;
  name: string;
  bio: string;
  followers: number;
  following: number;
  posts: number;
  verified: boolean;
  private: boolean;
  profile_url: string;
  avatar?: string;
}

export interface InstagramPostSummary {
  shortcode: string;
  type: string;
  caption: string;
  url: string;
  thumbnail: string;
  taken_at?: string;
  likes?: number;
  comments?: number;
  is_video?: boolean;
  video_url?: string;
}

function extractQuotedBio(description: string): string {
  const match = description.match(/on Instagram:\s*"([^"]+)"/i);
  return match?.[1]?.trim() || '';
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const normalized = decodeHtmlEntities(String(value || '')).trim();
    if (normalized) return normalized;
  }
  return '';
}

export function extractProfileFromMeta(meta: InstagramMetaProfile, fallbackUsername = ''): InstagramProfileSummary {
  const ogTitle = decodeHtmlEntities(meta.ogTitle || '');
  const ogDescription = decodeHtmlEntities(meta.ogDescription || '');
  const description = decodeHtmlEntities(meta.description || '');
  const canonicalUrl = decodeHtmlEntities(meta.canonicalUrl || '');

  const titleMatch = ogTitle.match(/^(.*?)\s*\(@([^)]+)\)/);
  const usernameFromTitle = titleMatch?.[2]?.trim() || '';
  const usernameFromCanonical = normalizeInstagramUsername(canonicalUrl);
  const username = firstNonEmpty(usernameFromTitle, usernameFromCanonical, fallbackUsername);

  const name = firstNonEmpty(titleMatch?.[1], username);

  const bio = firstNonEmpty(
    extractQuotedBio(description),
    extractQuotedBio(ogDescription)
  );

  const followersMatch = ogDescription.match(/([\d.,]+\s*[KMB]?)\s+Followers/i);
  const followingMatch = ogDescription.match(/([\d.,]+\s*[KMB]?)\s+Following/i);
  const postsMatch = ogDescription.match(/([\d.,]+\s*[KMB]?)\s+Posts/i);

  return {
    username,
    name,
    bio,
    followers: parseCount(followersMatch?.[1] || ''),
    following: parseCount(followingMatch?.[1] || ''),
    posts: parseCount(postsMatch?.[1] || ''),
    verified: false,
    private: false,
    profile_url: canonicalUrl || (username ? `https://www.instagram.com/${username}/` : ''),
    avatar: decodeHtmlEntities(meta.ogImage || ''),
  };
}

function pickBestImage(media: any): string {
  const images = [
    media?.image_versions2?.candidates?.[0]?.url,
    media?.thumbnail_url,
    media?.display_url,
    media?.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url,
  ];
  return firstNonEmpty(...images);
}

function pickVideoUrl(media: any): string {
  return firstNonEmpty(
    media?.video_versions?.[0]?.url,
    media?.carousel_media?.[0]?.video_versions?.[0]?.url
  );
}

function mediaTypeToName(mediaType: unknown): string {
  switch (Number(mediaType)) {
    case 2:
      return 'reel';
    case 8:
      return 'carousel';
    default:
      return 'post';
  }
}

export function extractPostsFromFeed(feed: any): InstagramPostSummary[] {
  const items = Array.isArray(feed?.items) ? feed.items : [];

  return items
    .map((item: any) => {
      const shortcode = String(item?.code || item?.shortcode || '').trim();
      if (!shortcode) return null;

      const caption = String(
        item?.caption?.text
        || item?.accessibility_caption
        || item?.carousel_media?.[0]?.accessibility_caption
        || ''
      ).trim();

      const videoUrl = pickVideoUrl(item);
      const isVideo = Boolean(item?.is_video || videoUrl);

      return {
        shortcode,
        type: mediaTypeToName(item?.media_type),
        caption,
        url: `https://www.instagram.com/${Number(item?.media_type) === 2 ? 'reel' : 'p'}/${shortcode}/`,
        thumbnail: pickBestImage(item),
        taken_at: item?.taken_at ? new Date(Number(item.taken_at) * 1000).toISOString() : undefined,
        likes: Number(item?.like_count || 0) || undefined,
        comments: Number(item?.comment_count || 0) || undefined,
        is_video: isVideo || undefined,
        video_url: videoUrl || undefined,
      } satisfies InstagramPostSummary;
    })
    .filter((item: InstagramPostSummary | null): item is InstagramPostSummary => Boolean(item));
}
