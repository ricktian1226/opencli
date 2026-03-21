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

export interface InstagramPostDetail {
  shortcode: string;
  type: string;
  author: string;
  caption: string;
  taken_at: string;
  likes?: number;
  comments?: number;
  url: string;
  image_urls: string[];
  video_urls: string[];
  media_count: number;
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const normalized = decodeHtmlEntities(String(value || '')).trim();
    if (normalized) return normalized;
  }
  return '';
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

function pickAllImages(media: any): string[] {
  const values = [
    media?.image_versions2?.candidates?.[0]?.url,
    media?.thumbnail_url,
    media?.display_url,
    ...(Array.isArray(media?.carousel_media)
      ? media.carousel_media.flatMap((item: any) => [
          item?.image_versions2?.candidates?.[0]?.url,
          item?.thumbnail_url,
          item?.display_url,
        ])
      : []),
  ];

  return Array.from(new Set(values.map((item) => firstNonEmpty(item)).filter(Boolean)));
}

function pickAllVideos(media: any): string[] {
  const values = [
    media?.video_versions?.[0]?.url,
    media?.video_url,
    ...(Array.isArray(media?.carousel_media)
      ? media.carousel_media.flatMap((item: any) => [
          item?.video_versions?.[0]?.url,
          item?.video_url,
        ])
      : []),
  ];

  return Array.from(new Set(values.map((item) => firstNonEmpty(item)).filter(Boolean)));
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

export function extractPostDetailFromMedia(media: any, fallbackUrl = ''): InstagramPostDetail | null {
  const shortcode = String(media?.code || media?.shortcode || '').trim();
  if (!shortcode) return null;

  const type = mediaTypeToName(media?.media_type);
  const imageUrls = pickAllImages(media);
  const videoUrls = pickAllVideos(media);
  const caption = String(
    media?.caption?.text
    || media?.accessibility_caption
    || media?.carousel_media?.[0]?.accessibility_caption
    || ''
  ).trim();

  const kind = Number(media?.media_type) === 2 ? 'reel' : 'p';
  const url = firstNonEmpty(fallbackUrl, `https://www.instagram.com/${kind}/${shortcode}/`);
  const author = firstNonEmpty(
    media?.user?.username,
    media?.owner?.username,
  );
  const takenAtValue = Number(media?.taken_at || media?.taken_at_timestamp || 0);
  const likesValue = media?.like_and_view_counts_disabled ? 0 : Number(media?.like_count || 0);

  return {
    shortcode,
    type,
    author,
    caption,
    taken_at: takenAtValue ? new Date(takenAtValue * 1000).toISOString() : '',
    likes: likesValue || undefined,
    comments: Number(media?.comment_count || 0) || undefined,
    url,
    image_urls: imageUrls,
    video_urls: videoUrls,
    media_count: imageUrls.length + videoUrls.length,
  };
}
